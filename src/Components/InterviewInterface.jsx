import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useBlocker } from "react-router-dom";
import { useVideoInterview } from "../Contexts/VideoInterviewContext";
import useStopReload from "./customHooks/useStopReload";
import { useMediaStream } from "./customHooks/useMediaStream";
import ReactMarkdown from "react-markdown";
import { useMicVAD } from "@ricky0123/vad-react";
import InterviewDisclaimer from "./InterviewDisclaimer";
import InterviewLoadingPopup from "./InterviewLoadingPopup";
import VideoInterviewWalkthrough from "./VideoInterviewWalkthrough";
import { AudioMetricsExtractor } from "../utils/AudioMetricsExtractor";
import { useCameraQualityCheck } from "./customHooks/useCameraQuality";
import AudioQualityIndicator from "../utils/AudioQualityIndicator";
import { getAuthToken } from "../utils/auth";
import FreeSessionEndedModal from "./Account/components/FreeSessionEndedModal";
import UpgradeModal from "./Account/components/UpgradeModal";
import {
  startInterview,
  submitResponse,
  endInterview as endInterviewAPI,
  getRespondTaskStatus,
  getInterviewFeedbackStatus,
} from "../api/interviewService";

import { fastApiClient, djangoClient } from "../api/client";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import {
  Square,
  Mic,
  Bot,
  Camera,
  CameraOff,
  Download,
  Clock,
  Code,
  Send,
  User,
  Volume2,
  X,
  VolumeX,
  AlertCircle,
  MicOff,
  CheckCircle,
  FileText,
  Zap,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import Editor from "@monaco-editor/react";
import Logo from "../assets/logo.png";
import CommunicationPhaseIndicator from "./Communication/CommunicationPhaseIndicator";
import SpeakingPhase from "./Communication/SpeakingPhase";
import ComprehensionPhase from "./Communication/ComprehensionPhase";
import MCQPhase from "./Communication/MCQPhase";
import MCQResults from "./Communication/MCQResults";

const InterviewInterface = () => {
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [gleeConnected, setGleeConnected] = useState(false);
  const [gleeInitialized, setGleeInitialized] = useState(false);
  const [setUpComplete, setSetUpComplete] = useState(false);
  const [onTakeTour, setOnTakeTour] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [newData, setNewData] = useState(null);

  // ── Free-tier time restriction ─────────────────────────────────────────────
  const [planStatus, setPlanStatus]                     = useState(null);
  const [showFiveMinWarning, setShowFiveMinWarning]     = useState(false);
  const [showFreeEndedModal, setShowFreeEndedModal]     = useState(false);
  const [freeEndFeedbackReady, setFreeEndFeedbackReady] = useState(false);
  const [showUpgradeFromTimer, setShowUpgradeFromTimer] = useState(false);
  const fiveMinWarnedRef  = useRef(false);
  const tenMinEndedRef    = useRef(false);
  // When true, the navigation useEffect must NOT fire — free-timer is handling the end
  const freeTimerEndedRef = useRef(false);
  const { state, dispatch } = useVideoInterview();
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const queuedMessageRef = useRef([]);
  
  // DEV MODE: Quick text-only testing (no audio)
  const [devMode, setDevMode] = useState(() => localStorage.getItem('devMode') === 'true');
  const [devTextInput, setDevTextInput] = useState('');

  const [codeEditor, setCodeEditor] = useState(() => {
    const sessionType = state.session;
    // Case Study, Communication, and Debate interviews don't use code editor
    if (
      sessionType === "Case Study Interview" ||
      sessionType === "Communication Interview" ||
      sessionType === "Debate Interview"
    ) {
      return false;
    }
    // Role-Based Interview, Technical Interview, Coding Interview, Subject, and Company interviews use code editor
    return (
      sessionType === "Technical Interview" ||
      sessionType === "Coding Interview" ||
      sessionType === "Subject" ||
      sessionType === "Company" ||
      sessionType === "Role-Based Interview"
    );
  });
  const [isCode, setIsCode] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [code, setCode] = useState("");
  const codeRef = useRef("");

  // Case Study specific state - Notes and Question area
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [caseStudyQuestion, setCaseStudyQuestion] = useState("");
  // Communication interview phase tracking
  const [communicationPhase, setCommunicationPhase] = useState(null);
  const [communicationData, setCommunicationData] = useState({
    speaking: null,
    speakingFeedback: null,
    comprehension: null,
    comprehensionFeedback: null,
    mcq: null,
    mcqCount: 0,
    mcqFeedback: null,
    mcqResults: null,
  });
  const [isSpeakingRecording, setIsSpeakingRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(true);
  const [text, setText] = useState("");

  const [noiseProfile, setNoiseProfile] = useState({
    isCalibrating: true,
    calibrationStartTime: Date.now(),
    silenceFrames: [],
    avgSilenceConfidence: 0,
  });

  const [checkingSession, setCheckingSession] = useState(true);

  // Debug: Track communicationPhase changes
  useEffect(() => {
    console.log(
      "[DEBUG] 🎭 communicationPhase changed to:",
      communicationPhase,
    );
    console.log(
      "[DEBUG] 📊 communicationData.mcqResults:",
      communicationData.mcqResults,
    );
  }, [communicationPhase, communicationData.mcqResults]);

  const [micEnabled, setMicEnabled] = useState(false);
  const [refreshTypedMessage, setRefreshTypedMessage] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [issessiongoing, setIsSessiongoing] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDisabled, setIsDisabled] = useState(true);
  // const [isLeaveDisabled, setIsLeaveDisabled] = useState(true);
  const [isInterviewerThinking, setIsInterviewerThinking] = useState(false);
  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);
  const interviewerCurrentProcess = useRef("Glee is thinking...");
  const [isIntervieweeSpeaking, setIsIntervieweeSpeaking] = useState(false);
  const [vadErrorDet, setVadErrorDet] = useState(false);

  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const [firstAIResponseReceived, setFirstAIResponseReceived] = useState(false);
  const [startProgress, setStartProgress] = useState(0);

  const [typedMessage, setTypedMessage] = useState("");
  const [vadConfidence, setVadConfidence] = useState(0);
  const [audioMetrics, setAudioMetrics] = useState(null);
  const [qualityWarning, setQualityWarning] = useState(null);
  const [showEndInterviewModal, setShowEndInterviewModal] = useState(false);
  const [showInterviewEndedModal, setShowInterviewEndedModal] = useState(false);
  const [isEndingInterview, setIsEndingInterview] = useState(false);
  const [specialSectionMicDisabled, setSpecialSectionMicDisabled] = useState(false);

  const specialSectionMicDisabledRef = useRef(false);

  const motionWidth = useMotionValue("33.3%");

  const webcamRef = useRef(null);
  const videoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const interfaceRef = useRef(null);
  // const vadRef = useRef(null);
  // const [vad, setVad] = useState(true);
  const codeAreaRef = useRef(null);
  const currentAudioRef = useRef(null);
  const interviewTypeIdRef = useRef(null);
  const sessionDurationRef = useRef(0);

  // Computed flag: when it's clearly user's turn to speak (AI finished, session active, mic ready)
  const isUserTurnToSpeak =
    issessiongoing && !isInterviewerSpeaking && micEnabled && !isProcessingAudio;

  // Prefer Glee video when available; fall back to avatar card on load error
  const [showGleeVideo, setShowGleeVideo] = useState(true);



  const sessionIdRef = useRef(null);
  const hasNavigatedRef = useRef(false);

  const Navigate = useNavigate();

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      interviewStarted && currentLocation.pathname !== nextLocation.pathname,
  );

  // useEffect(() => {
  //   console.log("[DEBUG] Blocker state changed:", blocker.state, "Session going:", issessiongoing);
  //   if(blocker.state === "blocked" && !issessiongoing){
  //     blocker.proceed();
  //     Navigate("/feedback-template");
  //   }
  // },[blocker.state, issessiongoing])

  useStopReload();

  const { stream: userMediaStream, error: mediaError } =
    useMediaStream(isStreaming);

  useEffect(() => {
    console.log(
      "[WARNING] Setting webcam stream",
      userMediaStream,
      webcamRef.current,
    );
    if (webcamRef.current && userMediaStream) {
      console.log("[IMPORTANT INFO] Assigning media stream to webcamRef");
      webcamRef.current.srcObject = userMediaStream;
    }
  }, [userMediaStream, setUpComplete]);

  useCameraQualityCheck({
    webcamRef,
    enabled: isStreaming && setUpComplete,
    setQualityWarning,
    sessionIdRef,
  });

  // DEV MODE: Toggle dev mode and persist to localStorage
  const toggleDevMode = useCallback(() => {
    const newMode = !devMode;
    setDevMode(newMode);
    localStorage.setItem('devMode', newMode.toString());
    console.log(`[DEV MODE] ${newMode ? 'ENABLED' : 'DISABLED'} - Text-only, no audio`);
  }, [devMode]);

  // DEV MODE: Send text response without audio
  const sendDevTextResponse = useCallback(async () => {
    if (!devTextInput.trim() || isProcessingAudio) return;
    
    const textToSend = devTextInput.trim();
    setDevTextInput('');
    setIsProcessingAudio(true);
    setIsInterviewerThinking(true);
    interviewerCurrentProcess.current = "Glee is processing...";
    
    // Add user message to chat immediately
    handleTranscript(textToSend);
    
    try {
      const sessionId = sessionIdRef.current;
      if (!sessionId) {
        console.error("[DEV MODE] No session ID");
        setIsProcessingAudio(false);
        setIsInterviewerThinking(false);
        return;
      }
      
      const { taskId } = await submitResponse({
        sessionId,
        textResponse: textToSend,
        codeInput: codeRef.current || null,
        skipAudio: true, // Tell backend to skip TTS
      });
      
      const poll = async () => {
        try {
          const res = await getRespondTaskStatus(sessionId, taskId);
          if (res?.status === "completed") {
            console.log("[DEV MODE] Response completed:", res);
            handleAIResponse({
              message: res?.result?.message,
              audioBase64: null, // No audio in dev mode
              lastNode: res?.interview_ai_response?.last_node,
              currentSpeaking: res?.interview_ai_response?.currentspeaking,
              speakingFeedback: res?.interview_ai_response?.speakingfeedback,
              comprehension: res?.interview_ai_response?.comprehension ?? res?.interview_ai_response?.currentcomprehension,
              comprehensionFeedback: res?.interview_ai_response?.comprehensionfeedback,
              currentMcq: res?.interview_ai_response?.currentmcq,
              mcqFeedback: res?.interview_ai_response?.mcqfeedback,
              mcqResults: res?.interview_ai_response?.mcq_results,
            });
            setIsProcessingAudio(false);
            setIsInterviewerThinking(false);
          } else if (res?.status === "failed") {
            console.error("[DEV MODE] Task failed:", res?.error);
            setIsProcessingAudio(false);
            setIsInterviewerThinking(false);
          } else {
            setTimeout(poll, 1000); // Poll faster in dev mode
          }
        } catch (err) {
          console.error("[DEV MODE] Error polling:", err);
          setTimeout(poll, 2000);
        }
      };
      poll();
    } catch (err) {
      console.error("[DEV MODE] Error sending text:", err);
      setIsProcessingAudio(false);
      setIsInterviewerThinking(false);
    }
  }, [devTextInput, isProcessingAudio, codeRef]);

  // FastAPI: Submit response from Communication phases (speaking/comprehension/MCQ) via REST
  const sendCommunicationResponse = useCallback(async (payload) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const { taskId } = await submitResponse({
        sessionId: sid,
        audioData: payload.audioData ?? undefined,
        textResponse: payload.textResponse ?? undefined,
        codeInput: payload.codeInput ?? undefined,
        sampleRate: payload.sampleRate ?? 16000,
      });
      if (taskId) {
        const poll = async () => {
          try {
            const res = await getRespondTaskStatus(sid, taskId);
            if (res?.status === "completed") {
              console.log("[DEBUG] Communication response completed:", res);
              // setNewData({
              //   message: res?.result?.message,
              //   audio: res?.interview_ai_response?.audio_base64,
              //   last_node: res?.interview_ai_response?.last_node,
              //   transcription: res?.interview_transcript,
              //   current_speaking: res?.current_speaking,
              //   speaking_feedback: res?.speaking_feedback,
              //   current_writing_comprehension:
              //     res?.current_writing_comprehension,
              //   current_mcq_entity: res?.current_mcq_entity,
              //   mcq_results: res?.mcq_results,
              // });
              handleTranscript(res?.interview_transcript);
              console.log("[FASTAPI] Interview AI Response: ", res?.interview_ai_response);
              console.log("[FASTAPI] Speaking feedback: ", res?.interview_ai_response?.speakingfeedback);
              handleAIResponse({
                message: res?.result?.message,
                audioBase64: res?.interview_ai_response?.audio_base64,
                lastNode: res?.interview_ai_response?.last_node,
                currentSpeaking: res?.interview_ai_response?.currentspeaking,
                speakingFeedback: res?.interview_ai_response?.speakingfeedback,
                comprehension: res?.interview_ai_response?.comprehension ?? res?.interview_ai_response?.currentcomprehension,
                comprehensionFeedback: res?.interview_ai_response?.comprehensionfeedback,
                currentMcq: res?.interview_ai_response?.currentmcq,
                mcqFeedback: res?.interview_ai_response?.mcqfeedback,
                mcqResults: res?.interview_ai_response?.mcq_results,
              });
            } else if (res?.status !== "failed") setTimeout(poll, 2000);
          } catch (_) {
            setTimeout(poll, 2000);
          }
        };
        setTimeout(poll, 2000);
      }
    } catch (err) {
      console.error("[FastAPI] sendCommunicationResponse error:", err);
    }
  }, []);

  // Helper function to convert Float32Array to WAV Blob
  const float32ArrayToWav = (float32Array, sampleRate) => {
    const buffer = new ArrayBuffer(44 + float32Array.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + float32Array.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, float32Array.length * 2, true);

    let offset = 44;
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += 2;
    }

    return new Blob([buffer], { type: "audio/wav" });
  };

  // FastAPI: Send audio via REST and process response via polling (or SSE)
  const sendAudioToBackend = async (audioData) => {
    if (isProcessingAudio) return;

    setIsProcessingAudio(true);
    setIsInterviewerThinking(true);
    interviewerCurrentProcess.current = "Glee is processing...";
    if (vad?.listening) vad.pause();

    const wavBlob = float32ArrayToWav(audioData, 16000);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Audio = reader.result.split(",")[1];
        const sessionId = sessionIdRef.current;
        if (!sessionId) {
          console.error("[FastAPI] No session ID");
          setIsProcessingAudio(false);
          setIsInterviewerThinking(false);
          return;
        }
        const { taskId, status } = await submitResponse({
          sessionId,
          audioData: base64Audio,
          codeInput: codeRef.current || null,
          sampleRate: 16000,
          skipAudio: devMode, // Skip TTS in dev mode
        });
        const poll = async () => {
          try {
            const res = await getRespondTaskStatus(sessionId, taskId);
            console.log("[DEBUG] [IMPORTANT POLL FOR RESPOND TASK STATUS] Respond task status:", res);
            const {
              status: st,
              result,
              interview_ai_response,
              interview_transcript,
            } = res;
            if (st === "completed") {
              // setNewData({
              //   message: result?.message,
              //   audio: interview_ai_response?.audio_base64,
              //   last_node: interview_ai_response?.last_node,
              //   transcription: interview_transcript,
              // });
              // console
              handleTranscript(interview_transcript);  // ← Adds user message
              console.log("[FASTAPI] Interview AI Response: ", res?.interview_ai_response);
              console.log("[FASTAPI] Speaking feedback: ", res?.interview_ai_response?.speaking_feedback);
              handleAIResponse({                       // ← Adds AI message
                  message: result?.message,
                  audioBase64: interview_ai_response?.audio_base64,
                  lastNode: interview_ai_response?.last_node,
                  currentSpeaking: res?.interview_ai_response?.currentspeaking,
                  speakingFeedback: res?.interview_ai_response?.speaking_feedback,
                  comprehension: res?.interview_ai_response?.comprehension ?? res?.interview_ai_response?.currentcomprehension,
                  comprehensionFeedback: res?.interview_ai_response?.comprehensionfeedback,
                  currentMcq: res?.interview_ai_response?.currentmcq,
                  mcqFeedback: res?.interview_ai_response?.mcqfeedback,
                  mcqResults: res?.interview_ai_response?.mcq_results,
              });
              // setIsProcessingAudio(false);
              setIsInterviewerThinking(false);
              return;
            }
            if (st === "failed") {
              setIsProcessingAudio(false);
              setIsInterviewerThinking(false);
              return;
            }
            setTimeout(poll, 2000);
          } catch (err) {
            console.error("[FastAPI] Error polling respond status:", err);
            setTimeout(poll, 2000);
          }
        };
        setTimeout(poll, 2000);
      } catch (err) {
        console.error("[FastAPI] Error submitting audio:", err);
        setIsProcessingAudio(false);
        setIsInterviewerThinking(false);
      }
    };
    reader.onerror = () => {
      setIsProcessingAudio(false);
      setIsInterviewerThinking(false);
    };
    reader.readAsDataURL(wavBlob);
  };

  // Initialize VAD with client-side detection
  const vad = useMicVAD({
    startOnLoad: false,

    onFrameProcessed: (probabilities) => {
      if (probabilities && probabilities.isSpeech !== undefined) {
        const confidence = probabilities.isSpeech;
        setVadConfidence(confidence);

        // Calibration period: collect baseline noise samples
        if (noiseProfile.isCalibrating) {
          const elapsed = Date.now() - noiseProfile.calibrationStartTime;

          // Collect low-confidence frames as noise baseline
          if (confidence < 0.3) {
            setNoiseProfile((prev) => ({
              ...prev,
              silenceFrames: [...prev.silenceFrames.slice(-100), confidence],
            }));
          }

          // End calibration after 10 seconds
          if (elapsed > 10000) {
            const avgNoise =
              noiseProfile.silenceFrames.length > 0
                ? noiseProfile.silenceFrames.reduce((a, b) => a + b, 0) /
                  noiseProfile.silenceFrames.length
                : 0.1;

            setNoiseProfile((prev) => ({
              ...prev,
              isCalibrating: false,
              avgSilenceConfidence: avgNoise,
            }));

            console.log(
              `Noise calibration complete. Baseline: ${avgNoise.toFixed(3)}`,
            );
            // Don't set error after calibration - this was causing false warnings
          }
        } else {
          // Post-calibration: detect unusual noise
          // Only trigger if noise is significantly above baseline
          const threshold = noiseProfile.avgSilenceConfidence + 0.25; // Increased threshold from 0.15 to 0.25

          // Only trigger if confidence is clearly in the problematic noise range
          // Require noise to be at least 0.15 above baseline to avoid false positives
          if (
            confidence > 0.35 &&
            confidence < threshold &&
            confidence > noiseProfile.avgSilenceConfidence + 0.15
          ) {
            // Detected sustained noise above baseline but below speech threshold
            // Only set error if it's clearly problematic noise (not just background)
            setVadErrorDet(true);
          }
          // Note: Error auto-clears after 3 seconds via useEffect, so we don't manually clear here
          // to avoid flickering
        }
      }
    },

    onSpeechStart: () => {
      // console.log("User started speaking");
      setIsIntervieweeSpeaking(true);
      console.log("[AUDIO] THE SPEECH HAS STARTED!!!");

      // if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      //   socketRef.current.send(JSON.stringify({
      //     type: 'speech_event',
      //     event: 'started',
      //     timestamp: Date.now()
      //   }));
      // }

      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    },

    onSpeechEnd: (audio) => {
      // console.log("User stopped speaking, audio length:", audio.length);
      setIsIntervieweeSpeaking(false);
      setVadConfidence(0);

      // For Communication Interview speaking exercise, DON'T auto-send
      // User must use record/submit buttons
      // BUT if feedback has been shown, allow normal audio sending (user is responding to transition question)
      const isSpeakingExercise =
        state.session === "Communication Interview" &&
        communicationPhase === "Speaking" &&
        communicationData.speaking &&
        !communicationData.speakingFeedback; // Only block if feedback hasn't been shown yet

      if (isSpeakingExercise) {
        // Don't auto-send during speaking exercise - user must use submit button
        console.log(
          "[AUDIO] Speaking exercise - audio captured but not auto-sending. User must submit manually.",
        );
        return;
      } else {
        // For other phases or after feedback, send immediately
        sendAudioToBackend(audio);
        console.log("[AUDIO] THE SPEECH HAS ENDED!!!");
      }

      // if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      //   socketRef.current.send(JSON.stringify({
      //     type: 'speech_event',
      //     event: 'ended',
      //     timestamp: Date.now()
      //   }));
      // }
    },

    onVADMisfire: () => {
      setIsIntervieweeSpeaking(false);
      setVadConfidence(0);
    },

    positiveSpeechThreshold: 0.6,
    negativeSpeechThreshold: 0.4,
    redemptionFrames: 10,
    preSpeechPadFrames: 2,
    minSpeechFrames: 5,

    baseAssetPath:
      "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.27/dist/",
    onnxWASMBasePath:
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
  });

  // Add this after your VAD initialization
  useEffect(() => {
    console.log("🎤 VAD State Check:", {
      vadLoading: vad.loading,
      vadListening: vad.listening,
      micEnabled: micEnabled,
      interviewStarted: interviewStarted,
      setUpComplete: setUpComplete,
      isStreaming: isStreaming,
    });
  }, [
    vad.loading,
    vad.listening,
    micEnabled,
    interviewStarted,
    setUpComplete,
    isStreaming,
  ]);

  function base64ToBlobUrl(base64) {
    const binary = atob(base64);
    const byteArray = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      byteArray[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([byteArray], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  }
  // FastAPI: Initialize interview with REST only (startInterview + poll start-status)
  useEffect(() => {
    if (!interviewStarted) return;
    if (sessionIdRef.current) {
      console.log(
        "[FastAPI] Interview already initialized, skipping:",
        sessionIdRef.current,
      );
      return;
    }

    const initializeInterview = async () => {
      try {
        const sessionstate = state.videoInterview;
        const sessionType = state.session;
        if (!sessionType) {
          Navigate("/video-interview");
          return;
        }
        setCheckingSession(false);

        const {
          Technical,
          HR,
          CompanyWise,
          SubjectWise,
          CaseStudy,
          Communication,
          RoleBased,
          Debate,
        } = sessionstate;
        let interviewType = "";
        let interviewPayload = {};
        try {
          if (Technical?.Resume) {
            interviewType = "Technical";
            interviewPayload = Technical;
          } else if (HR?.Resume) {
            interviewType = "HR";
            interviewPayload = HR;
          } else if (CompanyWise?.Company) {
            interviewType = "Company";
            interviewPayload = CompanyWise;
          } else if (SubjectWise?.Subject) {
            interviewType = "Subject";
            interviewPayload = SubjectWise;
          } else if (
            CaseStudy?.interview_type_id ||
            sessionType === "Case Study Interview"
          ) {
            interviewType = "CaseStudy";
            interviewPayload = CaseStudy?.interview_type_id
              ? { interview_type_id: CaseStudy.interview_type_id }
              : {};
          } else if (
            Communication?.interview_type_id ||
            sessionType === "Communication Interview"
          ) {
            interviewType = "Communication";
            interviewPayload = Communication?.interview_type_id
              ? { interview_type_id: Communication.interview_type_id }
              : {};
          } else if (
            Debate?.interview_type_id ||
            sessionType === "Debate Interview"
          ) {
            interviewType = "Debate";
            interviewPayload = Debate?.interview_type_id
              ? { interview_type_id: Debate.interview_type_id }
              : {};
          } else if (
            RoleBased?.role ||
            sessionType === "Role-Based Interview"
          ) {
            interviewType = "Role-Based Interview";
            interviewPayload = RoleBased?.role
              ? {
                  role: RoleBased.role,
                  interview_type_id: RoleBased.interview_type_id,
                  Resume: Technical?.Resume || HR?.Resume || "",
                }
              : {};
          } else {
            throw new Error("Not an interview type");
          }
        } catch (err) {
          console.error(err);
          Navigate("/oops-something-wrong");
          return;
        }

        interviewTypeIdRef.current =
          interviewType === "CaseStudy"
            ? CaseStudy?.interview_type_id || 35
            : interviewType === "Communication"
              ? Communication?.interview_type_id || 28
              : interviewType === "Debate"
                ? Debate?.interview_type_id || 31
                : interviewType === "RoleBased"
                  ? RoleBased?.interview_type_id || 30
                  : interviewType === "Company"
                    ? interviewPayload?.interview_type_id
                    : interviewType === "Subject"
                      ? interviewPayload?.interview_type_id
                      : interviewPayload?.interview_type_id;

        const userId =
          state.auth?.user?.email || state.auth?.user?.id || "current-user";

        console.log("[DEBUG] Starting interview with type: ", interviewType, "and payload: ", interviewPayload);

        const result = await startInterview({
          interviewType,
          userId,
          payload: interviewPayload,
        });

        sessionIdRef.current = result.sessionId;
        dispatch({ type: "SetRedix", payload: result.sessionId });
        setGleeInitialized(true);
        console.log("[FastAPI] Interview session started:", result.sessionId);

        const pollForStartStatus = async () => {
          const maxAttempts = 60;
          let attempts = 0;
          const poll = async () => {
            try {
              const token = await getAuthToken();
              const response = await fastApiClient.get(
                `/interview/start-status/${result.taskId}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              const {
                status,
                result: res,
                error,
                progress,
                interview_ai_response,
              } = response.data;
              setStartProgress(Number(progress) || 0);
              if (status === "completed") {
                console.log("[DEBUG] Start task completed:", response.data);
                if (
                  res?.message != null ||
                  interview_ai_response?.audio_base64
                ) {
                  // setNewData({
                  //   message: res?.message,
                  //   audio: interview_ai_response?.audio_base64,
                  //   last_node: interview_ai_response?.last_node,
                  //   current_speaking: response.data?.current_speaking,
                  //   speaking_feedback: response.data?.speaking_feedback,
                  //   current_writing_comprehension:
                  //     response.data?.current_writing_comprehension,
                  //   current_mcq_entity: response.data?.current_mcq_entity,
                  // });
                  setFirstAIResponseReceived(true);
                  setGleeConnected(true);
                  setSetUpComplete(true);
                  handleAIResponse({
                    message: res?.message,
                    audioBase64: interview_ai_response?.audio_base64,
                    lastNode: interview_ai_response?.last_node,
                    currentSpeaking: null,
                    speakingFeedback: null,
                    comprehension: interview_ai_response?.comprehension ?? interview_ai_response?.currentcomprehension,
                    comprehensionFeedback: null,
                    currentMcq: interview_ai_response?.currentmcq,
                    mcqFeedback: null,
                    mcqResults: interview_ai_response?.mcq_results,
                  });
                }
                return;
              }
              if (status === "failed") {
                console.error("[FastAPI] Start task failed:", error);
                return;
              }
              if (attempts < maxAttempts) {
                attempts++;
                setTimeout(poll, 1000);
              }
            } catch (err) {
              console.error("[FastAPI] Error polling start status:", err);
              if (attempts < maxAttempts) {
                attempts++;
                setTimeout(poll, 1000);
              }
            }
          };
          poll();
        };
        pollForStartStatus();
      } catch (error) {
        console.error("[FastAPI] Error initializing interview:", error);
        Navigate("/oops-something-wrong");
      }
    };

    initializeInterview();
  }, [
    interviewStarted,
    dispatch,
    Navigate,
    state.session,
    state.videoInterview,
    state.auth,
  ]);

  // useEffect(() => {
  // if (!vad.loading) {
  //   setMicEnabled(true);
  // }
  // }, [vad.loading]);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    if (!newData) return;
    if (!setUpComplete) {
      queuedMessageRef.current.push(newData);
      setNewData(null);
      return;
    }

    console.log("[INFO] Processing new data from backend:", newData);

    // Handle quality warnings from backend
    if (newData.type === "quality_warning") {
      setQualityWarning({
        type: newData.warning_type,
        message: newData.message,
      });
      setTimeout(() => setQualityWarning(null), 5000);
      return;
    }

    // Handle connection issues
    if (newData.type === "connection_issue") {
      setQualityWarning({
        type: "connection",
        message: newData.message,
      });
      setTimeout(() => setQualityWarning(null), 5000);
      return;
    }

    let type;
    let content;
    if (newData.last_node === "finished") {
      console.log("[DEBUG] last_node is 'finished'");
      console.log("[DEBUG] newData.mcq_results:", newData.mcq_results);
      console.log("[DEBUG] state.session:", state.session);
      console.log(
        "[DEBUG] Condition check:",
        !!newData.mcq_results,
        state.session === "Communication Interview",
      );

      // Capture MCQ results if available (Communication interview)
      if (newData.mcq_results && state.session === "Communication Interview") {
        console.log("[INFO] ✅ ENTERING MCQ RESULTS SECTION");
        console.log("[INFO] Storing MCQ results:", newData.mcq_results);
        setCommunicationData((prev) => ({
          ...prev,
          mcqResults: newData.mcq_results,
        }));
        console.log("[INFO] Setting communicationPhase to 'Results'");
        setCommunicationPhase("Results"); // Show results instead of ending immediately
        console.log(
          "[INFO] Current communicationPhase should now be 'Results'",
        );

        // Stop VAD
        if (vad.listening) {
          vad.pause();
        }
        setIsProcessingAudio(false);
        console.log(
          "[INFO] ⏹️ RETURNING EARLY - should not execute any code after this",
        );
        return; // Don't end the interview yet, show results first
      }

      console.log(
        "[DEBUG] ❌ Did NOT enter MCQ results section - will proceed to end interview",
      );

      // Stop VAD immediately when interview ends
      if (vad.listening) {
        vad.pause();
      }

      // Don't set interviewEndedBySystem flag - this should navigate to feedback page normally
      // Show interview ended modal before ending
      setShowInterviewEndedModal(true);
      setIsEndingInterview(true);
      // Stop VAD immediately when ending interview
      if (vad && vad.listening) {
        vad.pause();
      }
      // Delay the actual end call to show the modal
      setTimeout(() => {
        handleEndCall(true, true); // Pass true to indicate modal already shown
      }, 2000); // Show modal for 2 seconds before ending
      return;
    } else if (newData.transcription) {
      type = "user";
      content = newData.transcription;
    } else if (newData.message) {
      setIsInterviewerThinking(false);
      setIsProcessingAudio(false);
      type = "ai";
      content = newData.message;

      // Check if AI message matches the last user message (duplicate detection)
      // Skip this check for Communication interviews entirely (too many false positives during transitions)
      const isCommunicationInterview =
        state.session === "Communication Interview";

      if (!isCommunicationInterview) {
        const lastUserMessage = messages
          .filter((msg) => msg.type === "user")
          .pop();
        if (
          lastUserMessage &&
          lastUserMessage.content.trim().toLowerCase() ===
            content.trim().toLowerCase()
        ) {
          console.log(
            "[WARNING] AI returned duplicate message, ending interview",
          );
          // Stop VAD immediately
          if (vad && vad.listening) {
            vad.pause();
          }
          // End interview immediately without showing AI message
          setShowInterviewEndedModal(true);
          setIsEndingInterview(true);
          // Ensure VAD is stopped
          if (vad && vad.audioCtx && vad.audioCtx.state !== "closed") {
            vad.audioCtx.suspend().catch(() => {});
          }
          setTimeout(() => {
            handleEndCall(true, true);
          }, 2000);
          return;
        }
      }

      // Capture case study question when it's presented
      if (
        state.session === "Case Study Interview" &&
        newData.last_node === "CaseStudy" &&
        !caseStudyQuestion
      ) {
        setCaseStudyQuestion(content);
        console.log(
          "[INFO] Case study question captured:",
          content.substring(0, 100),
        );
      }

      // Capture Communication interview phases
      if (state.session === "Communication Interview") {
        const lastNode = newData.last_node;

        // Don't override phase if it's 'finished' - we handled that earlier and set to 'Results' if MCQ results exist
        if (lastNode !== "finished") {
          setCommunicationPhase(lastNode);
        }

        // Parse Communication phase data from backend response
        if (lastNode === "Speaking" || lastNode === "Speaking_after") {
          // Only parse speaking data if it's the initial speaking prompt (not feedback)
          // Check if this is feedback first
          const isFeedback =
            content.includes("good") ||
            content.includes("attempt") ||
            content.includes("pace") ||
            content.includes("pronunciation") ||
            content.includes("deviations") ||
            content.includes("grammatical") ||
            content.includes("precision") ||
            content.includes("accuracy") ||
            content.includes("strengths") ||
            content.includes("improvement") ||
            content.includes("fluency") ||
            content.includes("clear") ||
            content.includes("delivery") ||
            content.includes("minor") ||
            content.includes("received your speaking") ||
            content.includes("analyze it and provide some feedback");

          // Only parse speaking paragraph if it's NOT feedback
          if (!isFeedback) {
            // Check if backend sent structured speaking data
            if (newData.current_speaking) {
              setCommunicationData((prev) => ({
                ...prev,
                speaking: {
                  instruction:
                    newData.current_speaking.instruction ||
                    "Please read the following paragraph and speak it word for word:",
                  paragraph: newData.current_speaking.paragraph || "",
                },
              }));
            } else {
              // Fallback: parse from message content
              // Look for paragraph after instruction
              const parts = content.split("\n\n");
              if (parts.length >= 2) {
                setCommunicationData((prev) => ({
                  ...prev,
                  speaking: {
                    instruction:
                      parts[0] ||
                      "Please read the following paragraph and speak it word for word:",
                    paragraph: parts.slice(1).join("\n\n"),
                  },
                }));
              } else if (content.length > 50) {
                // Only treat as paragraph if it's long enough (not a short message)
                setCommunicationData((prev) => ({
                  ...prev,
                  speaking: {
                    instruction:
                      "Please read the following paragraph and speak it word for word:",
                    paragraph: content,
                  },
                }));
              }
            }
          }

          // Handle acknowledgment
          if (
            content.includes("received your speaking") ||
            content.includes("analyze it and provide some feedback")
          ) {
            setIsProcessingAudio(false);
            setCommunicationPhase("Speaking");
          }

          // Handle feedback - check if backend sent speaking_feedback or if content is feedback
          if (newData.speaking_feedback) {
            setIsProcessingAudio(false);
            setCommunicationData((prev) => ({
              ...prev,
              speakingFeedback: newData.speaking_feedback,
            }));
            setCommunicationPhase("Speaking"); // Keep in Speaking phase to show feedback in UI
          } else if (
            isFeedback &&
            !content.includes("Please read the following paragraph")
          ) {
            // This is the feedback - store it and show in SpeakingPhase UI
            // Make sure it's not the paragraph instruction
            setIsProcessingAudio(false);
            setCommunicationData((prev) => ({
              ...prev,
              speakingFeedback: content,
            }));
            setCommunicationPhase("Speaking"); // Keep in Speaking phase to show feedback in UI
          }
        } else if (lastNode === "Comprehension_before") {
          setCommunicationPhase("Comprehension_before");
        } else if (
          lastNode === "PersonalDetails" ||
          lastNode === "PersonalDetails_after"
        ) {
          setCommunicationPhase("PersonalDetails");
        } else if (
          lastNode === "Comprehension" ||
          lastNode === "Comprehension_after"
        ) {
          // Comprehension prompt: from interview_ai_response.comprehension (instruction, paragraph) or current_writing_comprehension
          const comp = newData.comprehension || newData.current_writing_comprehension;
          if (comp && (comp.instruction != null || comp.paragraph != null || comp.question != null)) {
            setCommunicationData((prev) => ({
              ...prev,
              comprehension: {
                instruction: comp.instruction ?? "",
                question: comp.paragraph ?? comp.question ?? "",
              },
            }));
            setCommunicationPhase("Comprehension");
            setIsProcessingAudio(false);
          } else if (!newData.current_writing_comprehension) {
            // This is feedback (no current_writing_comprehension but has content)
            // Check if it's feedback by looking for feedback keywords
            const isFeedback =
              content &&
              (content.includes("feedback") ||
                content.includes("relevance") ||
                content.includes("writing quality") ||
                content.includes("clarity") ||
                content.includes("strengths") ||
                content.includes("improvement") ||
                content.includes("well-written") ||
                content.includes("coherent") ||
                content.includes("ready to move on") ||
                content.includes("proceed to"));

            if (isFeedback) {
              // Store feedback separately, don't replace the question
              setCommunicationData((prev) => ({
                ...prev,
                comprehensionFeedback: content,
              }));
              setIsProcessingAudio(false);
              setCommunicationPhase("Comprehension_after"); // Keep in Comprehension phase to show feedback
            } else {
              // Fallback: treat as new question
              let questionText = content;
              if (
                content.includes(
                  "Please write 50-100 words on the following scenario:",
                )
              ) {
                questionText = content
                  .replace(
                    "Please write 50-100 words on the following scenario:",
                    "",
                  )
                  .trim();
              }
              const parts = questionText.split("\n\n");
              setCommunicationData((prev) => ({
                ...prev,
                comprehension: {
                  instruction: "",
                  question:
                    parts.length > 1
                      ? parts.slice(1).join("\n\n")
                      : questionText,
                },
              }));
              setIsProcessingAudio(false);
            }
          }
        } else if (lastNode === "MCQ" || lastNode === "MCQ_after") {
          // Check if backend sent structured MCQ data
          if (newData.current_mcq_entity) {
            const newQuestion = newData.current_mcq_entity.question || "";

            setCommunicationData((prev) => {
              // Only increment count if this is a NEW question (different from current)
              const isNewQuestion = prev.mcq?.question !== newQuestion;
              const newCount = isNewQuestion
                ? prev.mcqCount + 1
                : prev.mcqCount;
              const cappedCount = Math.min(newCount, 4); // Cap at 4 questions max

              console.log("[MCQ] Question check:", {
                current: prev.mcq?.question?.substring(0, 50),
                new: newQuestion.substring(0, 50),
                isNew: isNewQuestion,
                currentCount: prev.mcqCount,
                newCount: cappedCount,
              });

              return {
                ...prev,
                mcq: {
                  instruction: newData.current_mcq_entity.instruction || "",
                  question: newQuestion,
                  options: newData.current_mcq_entity.options || [],
                },
                mcqCount: cappedCount,
              };
            });
            setCommunicationPhase("MCQ");
          } else {
            // Fallback: parse from message content
            const optionsMatch = content.match(/(\d+\)\s*.+)/g);
            if (optionsMatch) {
              const options = optionsMatch.map((opt) =>
                opt.replace(/^\d+\)\s*/, ""),
              );
              const parts = content.split("\n\n");
              const newQuestion = parts[1] || content;

              setCommunicationData((prev) => {
                // Only increment count if this is a NEW question
                const isNewQuestion = prev.mcq?.question !== newQuestion;
                const newCount = isNewQuestion
                  ? prev.mcqCount + 1
                  : prev.mcqCount;
                const cappedCount = Math.min(newCount, 4); // Cap at 4 questions max

                return {
                  ...prev,
                  mcq: {
                    instruction: parts[0] || "",
                    question: newQuestion,
                    options: options,
                  },
                  mcqCount: cappedCount,
                };
              });
              setCommunicationPhase("MCQ");
            }
          }
          setIsProcessingAudio(false);
        }
      }
    } else if (newData.error) {
      if (
        typeof newData.error === "string" &&
        newData.error.toLowerCase() === "offensive"
      ) {
        // Set flag in sessionStorage so VideoInterview can show modal after redirect
        sessionStorage.setItem("interviewEndedOffensive", "true");

        // Stop VAD immediately when ending interview
        if (vad && vad.listening) {
          vad.pause();
        }
        setShowInterviewEndedModal(true);
        setIsEndingInterview(true);
        setTimeout(() => {
          handleEndCall(true, true); // Pass true to indicate modal already shown
        }, 2000);
      }
      setIsProcessingAudio(false);
    }
    if (newData.message || newData.transcription) {
      // For Communication Interview, don't show transcription messages in chat during rounds
      // Only show AI messages and transcriptions during Greeting/Rapport phases
      // BUT allow transcriptions after feedback is shown (user responding to transition question)
      const isCommunicationRound =
        state.session === "Communication Interview" &&
        communicationPhase &&
        (communicationPhase === "Speaking" ||
          communicationPhase === "Speaking_after" ||
          communicationPhase === "Comprehension" ||
          communicationPhase === "Comprehension_before" ||
          communicationPhase === "Comprehension_after" ||
          communicationPhase === "MCQ" ||
          communicationPhase === "MCQ_after");

      // Check if feedback has been shown (user is responding to transition question)
      const isAfterFeedback =
        state.session === "Communication Interview" &&
        communicationPhase === "Speaking" &&
        communicationData.speakingFeedback;

      // Skip adding transcription messages to chat during Communication rounds
      // EXCEPT if feedback has been shown (user is responding to transition question)
      if (
        isCommunicationRound &&
        !isAfterFeedback &&
        type === "user" &&
        newData.transcription
      ) {
        console.log(
          "[INFO] Skipping transcription message in chat during Communication round:",
          content,
        );
        setIsProcessingAudio(false);
        setNewData(null);
        return;
      }

      // Skip feedback messages in chat during Speaking phase (they show in SpeakingPhase UI)
      if (
        state.session === "Communication Interview" &&
        communicationPhase === "Speaking" &&
        type === "assistant" &&
        (content.includes("good") ||
          content.includes("attempt") ||
          content.includes("pace") ||
          content.includes("pronunciation") ||
          content.includes("deviations") ||
          content.includes("grammatical") ||
          content.includes("precision") ||
          content.includes("accuracy") ||
          content.includes("strengths") ||
          content.includes("improvement") ||
          content.includes("fluency") ||
          content.includes("clear") ||
          content.includes("delivery") ||
          content.includes("minor") ||
          content.includes("adjustment"))
      ) {
        console.log(
          "[INFO] Skipping feedback message in chat - will show in SpeakingPhase UI:",
          content,
        );
        // Store feedback for SpeakingPhase component
        setCommunicationData((prev) => ({
          ...prev,
          speakingFeedback: content,
        }));
        setIsProcessingAudio(false);
        setNewData(null);
        return;
      }

      // Skip feedback messages in chat during Comprehension phase (they show in ComprehensionPhase UI)
      if (
        state.session === "Communication Interview" &&
        (communicationPhase === "Comprehension" ||
          communicationPhase === "Comprehension_before" ||
          communicationPhase === "Comprehension_after") &&
        type === "assistant" &&
        (content.includes("relevance") ||
          content.includes("writing quality") ||
          content.includes("clarity") ||
          content.includes("strengths") ||
          content.includes("improvement") ||
          content.includes("well-written") ||
          content.includes("coherent") ||
          content.includes("ready to move on") ||
          content.includes("proceed to"))
      ) {
        console.log(
          "[INFO] Skipping comprehension feedback message in chat - will show in ComprehensionPhase UI:",
          content,
        );
        setCommunicationData((prev) => ({
          ...prev,
          comprehensionFeedback: content,
        }));
        setIsProcessingAudio(false);
        setNewData(null);
        return;
      }

      const userMessage = {
        id: uuidv4(),
        type: type,
        content: content,
        timestamp: new Date(),
      };
      setIsAnalyzing(false);
      setRefreshTypedMessage(true);
      setCurrentMessage(userMessage.content);
      if (userMessage.type === "ai") {
        setIsDisabled(false);
      }
      setMessages((prev) => [...prev, userMessage]);
      messagesEndRef.current?.focus();
    }

    // Case Study, Communication, and Debate interviews don't use code editor
    if (
      state.session === "Case Study Interview" ||
      state.session === "Communication Interview" ||
      state.session === "Debate Interview"
    ) {
      setIsCode(false);
    } else if (
      newData.last_node === "code" ||
      newData.last_node === "Coding" ||
      newData.last_node === "Coding_after" ||
      state.session === "Technical Interview" ||
      state.session === "Coding Interview" ||
      state.session === "Subject" ||
      state.session === "Company" ||
      (state.session === "Role-Based Interview" &&
        (newData.last_node === "Coding" ||
          newData.last_node === "Coding_after" ||
          newData.last_node === "code" ||
          // Also check message content for coding-related keywords
          (newData.message &&
            /write.*code|code.*snippet|implement.*code|write.*function|write.*code|coding.*challenge|write.*javascript|write.*python|write.*html|write.*css|write.*sql/i.test(
              newData.message,
            ))))
    ) {
      setIsCode(true);
    } else if (
      state.session === "Role-Based Interview" ||
      state.session === "Technical Interview" ||
      state.session === "Coding Interview" ||
      state.session === "Subject" ||
      state.session === "Company"
    ) {
      // For these interview types, keep isCode true once it's been set (don't reset to false)
      // This allows code editor to remain accessible throughout the interview
      // Only set to false if we're explicitly in a non-coding phase
      if (
        newData.last_node &&
        (newData.last_node.includes("Greeting") ||
          newData.last_node.includes("Personalised") ||
          newData.last_node.includes("Project"))
      ) {
        // Keep previous isCode state - don't change it
      }
      // Don't set to false - keep current state
    } else {
      setIsCode(false);
    }
    if (newData.audio) {
      // console.log("[INFO] We have audio to play from backend");
      // console.log("[INFO] Audio base64 sample:", newData.audio.slice(0, 200));
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }

      // Stop the video as well
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }

      const audioUrl = base64ToBlobUrl(newData.audio);
      const audio = new Audio(audioUrl);
      // audio.autoplay = true;
      // audio.oncanplaythrough = () => audio.play();

      // Store reference to current audio
      currentAudioRef.current = audio;

      audio.onplay = () => {
        // When Glee audio actually starts (websocket path), mark setup complete
        setSetUpComplete(true);
        // Pause VAD when AI starts speaking
        if (vad && vad.listening) {
          vad.pause();
        }
        setIsInterviewerSpeaking(true);

        if (videoRef.current) {
          videoRef.current
            .play()
            // .then(() => setIsLeaveDisabled(true))
            .catch((err) => {
              console.error("Video play failed:", err);
              // Navigate("/oops-something-wrong")
            });
        }
      };

      audio.onended = () => {
        // Resume VAD when AI finishes speaking (only if session is still going)
        setIsInterviewerSpeaking(false);
        if (
          issessiongoing &&
          !isEndingInterview &&
          micEnabled &&
          interviewStarted
        ) {
          // Small delay to ensure audio has fully stopped
          setTimeout(() => {
            if (
              vad &&
              !vad.listening &&
              !isInterviewerThinking &&
              !isInterviewerSpeaking
            ) {
        
            }
          }, 300);
        }

        if (videoRef.current) {
          setIsDisabled(false);
          // setIsLeaveDisabled(false);
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
        // Clear reference when audio finishes
        currentAudioRef.current = null;
      };

      // Also clear reference if audio errors
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        currentAudioRef.current = null;
      };

      audio.play().catch((err) => {
        console.error("Autoplay failed:", err);
        currentAudioRef.current = null;
        // Navigate("/oops-something-wrong")
      });
    }
  }, [newData, setUpComplete]);

  useEffect(() => {
    specialSectionMicDisabledRef.current = specialSectionMicDisabled;
  }, [specialSectionMicDisabled])

  const handleTranscript = useCallback((transcript) => {
    if (!transcript) return;
    
    console.log("[FastAPI] Transcript received:", transcript);
    
    // Check if this transcript was already processed (prevent duplicates)
    const lastUserMessage = messages.filter(msg => msg.type === 'user').pop();
    if (lastUserMessage && lastUserMessage.content.trim() === transcript.trim()) {
      console.log("[FastAPI] Duplicate transcript ignored:", transcript);
      return;
    }
    
    // Add user message to chat
    const userMessage = {
      id: uuidv4(),
      type: 'user',
      content: transcript,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
  }, [messages]);

  
  const handleAIResponse = useCallback(({ message, audioBase64, lastNode, currentSpeaking, speakingFeedback, comprehension, comprehensionFeedback, currentMcq, mcqFeedback, mcqResults }) => {
    console.log("[FastAPI] AI Response received:", message?.substring(0, 100));
    console.log("[FastAPI] lastNode:", lastNode);
    console.log("[FastAPI] currentMcq:", currentMcq);
    console.log("[FastAPI] mcqFeedback:", mcqFeedback);
    
    if (!message && !audioBase64) {
      console.warn("[FastAPI] Empty AI response received");
      return;
    }
    
    // Mark first AI response as received
    if (!firstAIResponseReceived && (audioBase64 || message)) {
      console.log("[FastAPI] First AI response received, completing setup");
      setFirstAIResponseReceived(true);
      // In dev/text-only mode (no audio), show the interface immediately.
      // For normal runs, we wait until Glee's audio actually starts playing.
      if (!audioBase64 || devMode) {
        setSetUpComplete(true);
      }
    }
    
    setIsInterviewerThinking(false);
    setIsProcessingAudio(false);
    
    // Handle interview completion
    if (lastNode === 'finished') {
      console.log("[DEBUG] Interview finished");
      
      if (vad?.listening) vad.pause();
      setShowInterviewEndedModal(true);
      setIsEndingInterview(true);
      setTimeout(() => handleEndCall(true, true), 2000);
      return;
    }
    
    // Add AI message to chat
    if (message && !currentSpeaking) {
      const aiMessage = {
        id: uuidv4(),
        type: 'ai',
        content: message,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setCurrentMessage(message);
      setRefreshTypedMessage(true);
      setIsDisabled(false);
    }

    if (state.session === 'Communication Interview') {
  
      // Speaking paragraph received - new speaking exercise
      if (lastNode === 'Speaking' && currentSpeaking?.paragraph) {
        setCommunicationData(prev => ({
          ...prev,
          speaking: {
            instruction: currentSpeaking.instruction || "Please read the following paragraph and speak it word for word:",
            paragraph: currentSpeaking.paragraph,
          },
          speakingFeedback: null,  // Clear old feedback
        }));
        setCommunicationPhase("Speaking");
        console.log("[INFO] Speaking paragraph captured:", currentSpeaking.paragraph.substring(0, 50));
        setSpecialSectionMicDisabled(true);
      }
      
      // Speaking feedback received - only set phase to Speaking if lastNode is Speaking-related
      if (speakingFeedback && (lastNode === 'Speaking_feedback' || lastNode === 'Speaking')) {
        console.log("[FASTAPI] Speaking feedback received: ", speakingFeedback);
        setCommunicationData(prev => ({
          ...prev,
          speakingFeedback: speakingFeedback,
        }));
        setCommunicationPhase("Speaking");
        console.log("[INFO] Speaking feedback received, setting phase to Speaking");
        setSpecialSectionMicDisabled(false);
        if (message) {
          setCurrentMessage(message);
          setRefreshTypedMessage(true);
          setIsDisabled(false);
        }
      }

      // Comprehension phase: instruction + paragraph/question - new comprehension exercise
      if (lastNode === 'Comprehension' && comprehension && (comprehension.instruction != null || comprehension.paragraph != null || comprehension.question != null)) {
        setCommunicationData(prev => ({
          ...prev,
          comprehension: {
            instruction: comprehension.instruction ?? '',
            question: comprehension.paragraph ?? comprehension.question ?? '',
          },
          comprehensionFeedback: null,
        }));
        setCommunicationPhase("Comprehension");
        console.log("[INFO] Comprehension prompt received:", comprehension.instruction?.substring(0, 50));
        setSpecialSectionMicDisabled(true);
      }
      
      // Comprehension feedback received - only set phase to Comprehension if lastNode is Comprehension-related
      if (comprehensionFeedback && (lastNode === 'Comprehension_feedback' || lastNode === 'Comprehension')) {
        console.log("[FASTAPI] Comprehension feedback received: ", comprehensionFeedback);
        setCommunicationData(prev => ({
          ...prev,
          comprehensionFeedback: comprehensionFeedback,
        }));
        setCommunicationPhase("Comprehension");
        console.log("[INFO] Comprehension feedback received, setting phase to Comprehension");
        setSpecialSectionMicDisabled(false);
        if (message) {
          setCurrentMessage(message);
          setRefreshTypedMessage(true);
          setIsDisabled(false);
        }
      }
      
      // MCQ phase: new MCQ question received
      if ((lastNode === 'MCQ' || lastNode === 'MCQ_after') && currentMcq) {
        const newQuestion = currentMcq.question || "";
        setCommunicationData(prev => {
          const isNewQuestion = prev.mcq?.question !== newQuestion;
          const cappedCount = isNewQuestion ? prev.mcqCount + 1 : prev.mcqCount;
          
          console.log("[MCQ] Question received:", {
            current: prev.mcq?.question?.substring(0, 50),
            new: newQuestion.substring(0, 50),
            isNew: isNewQuestion,
            count: cappedCount,
          });
          
          return {
            ...prev,
            mcq: {
              instruction: currentMcq.instruction || "",
              question: newQuestion,
              options: currentMcq.options || [],
            },
            mcqCount: cappedCount,
            mcqFeedback: null,  // Clear old feedback
          };
        });
        setCommunicationPhase("MCQ");
        console.log("[INFO] MCQ question received, setting phase to MCQ");
        setSpecialSectionMicDisabled(true);
      }
      
      // MCQ feedback received - only set phase to MCQ if lastNode is MCQ-related
      if (mcqFeedback && (lastNode === 'MCQ_feedback' || lastNode === 'MCQ_after')) {
        console.log("[FASTAPI] MCQ feedback received: ", mcqFeedback);
        setCommunicationData(prev => ({
          ...prev,
          mcqFeedback: mcqFeedback,
        }));
        setCommunicationPhase("MCQ");
        console.log("[INFO] MCQ feedback received, setting phase to MCQ");
        setSpecialSectionMicDisabled(false);
        if (message) {
          setCurrentMessage(message);
          setRefreshTypedMessage(true);
          setIsDisabled(false);
        }
      }
      
      // MCQ results received
      if (mcqResults) {
        console.log("[FASTAPI] MCQ results received:", mcqResults);
        setCommunicationData(prev => ({
          ...prev,
          mcqResults: mcqResults,
        }));
        setCommunicationPhase("Results");
        console.log("[INFO] MCQ results received, setting phase to Results");
        setSpecialSectionMicDisabled(false);
      }
    }
    
    // Handle case study question capture
    if (state.session === 'Case Study Interview' && lastNode === 'CaseStudy' && !caseStudyQuestion) {
      setCaseStudyQuestion(message);
      console.log("[INFO] Case study question captured:", message?.substring(0, 100));
    }
    
    // Handle code editor visibility
    if (state.session === 'Case Study Interview' || 
        state.session === 'Communication Interview' || 
        state.session === 'Debate Interview') {
      setIsCode(false);
    } else if (lastNode === 'code' || lastNode === 'Coding' || lastNode === 'Codingafter') {
      setIsCode(true);
    } else if (state.session === 'Technical Interview' || 
               state.session === 'Coding Interview' || 
               state.session === 'Subject' || 
               state.session === 'Company' || 
               state.session === 'Role-Based Interview') {
      // Keep code editor visible for these interview types
      // Don't change isCode state
    }
    
    // Play audio if available (skip in dev mode)
    if (audioBase64 && !devMode) {
      console.log("[AUDIO] Received audio, length:", audioBase64.length);
      
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      
      const audioUrl = base64ToBlobUrl(audioBase64);
      const audio = new Audio(audioUrl);
      audio.autoplay = true;
      
      currentAudioRef.current = audio;
      
      audio.onplay = () => {
        console.log("[AUDIO] Playing audio");
        // First time Glee actually starts speaking -> show the interface
        setSetUpComplete(true);
        
        // Pause VAD when AI starts speaking
        if (vad?.listening) vad.pause();
        setIsInterviewerSpeaking(true);
        setMicEnabled(false);
        
        if (videoRef.current) {
          videoRef.current.play()
            .then(() => setIsLeaveDisabled(true))
            .catch(err => console.error("Video play failed", err));
        }
      };
      
      audio.onended = () => {
        console.log("[AUDIO] Audio playback ended");
        setIsInterviewerSpeaking(false);
        currentAudioRef.current = null;
        
        if (!specialSectionMicDisabledRef.current) {
          setTimeout(() => {
            setMicEnabled(true);
          }, 300);
        }
        
        // Resume VAD when AI finishes speaking (only if session is still going)
        // if (issessiongoing && !isEndingInterview && micEnabled && interviewStarted) {
        //   setTimeout(() => {
        //     if (vad && !vad.listening && !isInterviewerThinking && !isInterviewerSpeaking) {
        //       console.log("[AUDIO] Resuming VAD after audio ended");
              
        //     }
        //   }, 300);
        // }
        
        if (videoRef.current) {
          setIsDisabled(false);
          setIsLeaveDisabled(false);
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
        
        // clearTimeout(timeout);
        
      };
      
      audio.onerror = (e) => {
        console.error("[AUDIO] Audio playback error", e);
        currentAudioRef.current = null;
      };
      
      audio.play().catch(err => {
        console.error("[AUDIO] Autoplay failed", err);
        currentAudioRef.current = null;
      });
    }
    
  }, [
    vad, 
    messages, 
    state.session, 
    caseStudyQuestion, 
    firstAIResponseReceived,
    devMode,
    issessiongoing,
    isEndingInterview,
    micEnabled,
    interviewStarted,
    isInterviewerThinking,
    isInterviewerSpeaking
  ]);
  

  useEffect(() => {
    if (queuedMessageRef.current.length === 0) return;

    queuedMessageRef.current.forEach((data) => {
      setNewData(data);
      // console.log("[INFO] Processing queued data from backend:", data);
    });
  }, [setUpComplete]);

  useEffect(() => {
    if (vadErrorDet === false) return;

    const timer = setTimeout(() => {
      setVadErrorDet(false);
    }, 3000); // Show warning for 3 seconds

    // Cleanup timeout if component unmounts or vadErrorDet changes
    return () => clearTimeout(timer);
  }, [vadErrorDet]);

  useEffect(() => {
    // Don't start VAD if interview has ended
    if (!issessiongoing || isEndingInterview) {
      if (vad && vad.listening) {
        vad.pause();
      }
      return;
    }

    // Pause VAD when AI is thinking or speaking
    if (isInterviewerThinking || isInterviewerSpeaking) {
      if (vad && vad.listening) {
        setMicEnabled(false);
        vad.pause();
      }
      return;
    }


  }, [
    micEnabled,
    vad.loading,
    vad.listening,
    interviewStarted,
    issessiongoing,
    isInterviewerThinking,
    isInterviewerSpeaking,
    isEndingInterview,
  ]);

  useEffect(() => {
    if (mediaError) {
      console.error("Permissions have been denied for microphone and video");
      alert("Microphone and Video is crucial for the interview");
    }
  }, [mediaError]);

  useEffect(() => {
    // Stop timer if interview has ended
    if (!issessiongoing) {
      return;
    }

    let interval;
    if (setUpComplete) {
      interval = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [setUpComplete, issessiongoing]);

  const messagesContainerRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messagesEndRef.current && messagesContainerRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 100);
    }
  }, [messages, isIntervieweeSpeaking, isInterviewerThinking]);

  useEffect(() => {
    // Show text immediately without typing animation
    if (!issessiongoing) {
      return;
    }

    if (refreshTypedMessage) {
      setRefreshTypedMessage(false);
    }
    
    // Set the full message immediately (no animation)
    setTypedMessage(currentMessage);
  }, [currentMessage, refreshTypedMessage, issessiongoing]);

  useEffect(() => {
    if (codeAreaRef.current) {
      const t = [
        "[--angle:0deg]",
        "[background:conic-gradient(from_var(--angle),theme(colors.red.500),theme(colors.orange.500),theme(colors.yellow.400),theme(colors.green.500),theme(colors.blue.500),theme(colors.indigo.500),theme(colors.purple.500),theme(colors.red.500))_border-box]",
        "animate-[spin-angle_2s_linear_infinite]",
      ];
      if (isAnalyzing) {
        for (let p of t) codeAreaRef.current.classList.add(p);
      } else {
        for (let p of t) codeAreaRef.current.classList.remove(p);
      }
    }
  }, [isAnalyzing]);

  useEffect(() => {
    // console.log("Session duration updated:", sessionDuration);
    sessionDurationRef.current = sessionDuration;
    // console.log("This is current state -> ", state);
  }, [sessionDuration]);

  // ── Fetch plan status once on mount ────────────────────────────────────────
  useEffect(() => {
    const fetchPlanStatus = async () => {
      try {
        const { data } = await djangoClient.get('billing/plan-status/');
        setPlanStatus(data);
      } catch (err) {
        console.warn('[FreeTimer] Could not fetch plan status:', err);
      }
    };
    fetchPlanStatus();
  }, []);

  // ── Store session start timestamp in sessionStorage (persists across refresh) ─
  useEffect(() => {
    if (setUpComplete && !sessionStorage.getItem('interview_start_ts')) {
      sessionStorage.setItem('interview_start_ts', String(Date.now()));
    }
  }, [setUpComplete]);

  // ── Free-tier time enforcement ──────────────────────────────────────────────
  useEffect(() => {
    if (!planStatus?.has_time_limit) return;
    if (!issessiongoing) return;

    // Restore elapsed time from sessionStorage so refresh doesn't reset the clock
    const storedStart = sessionStorage.getItem('interview_start_ts');
    const elapsed = storedStart
      ? Math.floor((Date.now() - Number(storedStart)) / 1000)
      : sessionDuration;

    const effectiveDuration = Math.max(sessionDuration, elapsed);

    // 5-minute warning (non-blocking)
    if (effectiveDuration >= 300 && !fiveMinWarnedRef.current) {
      fiveMinWarnedRef.current = true;
      setShowFiveMinWarning(true);
    }

    // 10-minute hard stop
    if (effectiveDuration >= 600 && !tenMinEndedRef.current) {
      tenMinEndedRef.current = true;
      setShowFiveMinWarning(false);
      sessionStorage.removeItem('interview_start_ts');

      // Block the normal navigation useEffect from firing
      freeTimerEndedRef.current = true;

      // Stop VAD / audio
      if (vad && vad.listening) vad.pause();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }

      // Call endInterviewAPI so feedback is generated for visible nodes
      (async () => {
        try {
          const sessionid = sessionIdRef.current;
          let interview_type = state.session;
          const duration = sessionDurationRef.current ?? 0;
          let interview_test_id = interviewTypeIdRef.current
            ? parseInt(interviewTypeIdRef.current)
            : null;
          if (interview_type === 'Case Study Interview') interview_test_id = 35;
          if (interview_type === 'Communication Interview') interview_test_id = 28;
          if (interview_type === 'Debate Interview') interview_test_id = 31;
          if (interview_type === 'Role-Based Interview' || state.videoInterview?.RoleBased?.role) {
            interview_type = 'Role-Based Interview';
            if (!interview_test_id) {
              interview_test_id = state.videoInterview?.RoleBased?.interview_type_id
                ? parseInt(state.videoInterview.RoleBased.interview_type_id)
                : 30;
            }
          }
          if (interview_type === 'Company') {
            const id = state.videoInterview?.CompanyWise?.interview_type_id;
            if (id != null) interview_test_id = parseInt(id, 10);
          }
          if (interview_type === 'Subject') {
            const id = state.videoInterview?.SubjectWise?.interview_type_id;
            if (id != null) interview_test_id = parseInt(id, 10);
          }

          const endResponse = await endInterviewAPI({
            sessionId: sessionid,
            interviewType: interview_type,
            interviewTestId: interview_test_id ?? undefined,
            duration,
            sessionFinished: true,
          });

          const taskId = endResponse?.task_id;
          if (taskId) {
            const maxAttempts = 60;
            const intervalMs = 5000;
            const pollForFeedback = (attempt = 0) => {
              if (attempt >= maxAttempts) {
                setFreeEndFeedbackReady(true);
                setShowFreeEndedModal(true);
                return;
              }
              getInterviewFeedbackStatus(taskId)
                .then((statusRes) => {
                  if (statusRes.status === 'completed' || statusRes.status === 'failed') {
                    setFreeEndFeedbackReady(true);
                    setShowFreeEndedModal(true);
                  } else {
                    setTimeout(() => pollForFeedback(attempt + 1), intervalMs);
                  }
                })
                .catch(() => setTimeout(() => pollForFeedback(attempt + 1), intervalMs));
            };
            // Show modal immediately but feedback not ready yet — user sees upgrade options
            // while feedback processes in background
            setShowFreeEndedModal(true);
            pollForFeedback();
          } else {
            setFreeEndFeedbackReady(true);
            setShowFreeEndedModal(true);
          }
        } catch (err) {
          console.error('[FreeTimer] endInterviewAPI failed:', err);
          // Still show modal even on error
          setFreeEndFeedbackReady(true);
          setShowFreeEndedModal(true);
        }
      })();
    }
  }, [sessionDuration, planStatus, issessiongoing]);

  useEffect(() => {
    // Prevent multiple navigations
    if (hasNavigatedRef.current) {
      return;
    }

    // Free-timer end is handled separately — don't navigate here
    if (freeTimerEndedRef.current) {
      return;
    }

    if (!issessiongoing) {
      // Check if we have flags for special end cases that should redirect to /video-interview
      const noConversationFlag = sessionStorage.getItem(
        "interviewEndedNoConversation",
      );
      const offensiveFlag = sessionStorage.getItem("interviewEndedOffensive");
      const systemEndedFlag = sessionStorage.getItem("interviewEndedBySystem");

      // Stop VAD when session ends
      if (vad && vad.listening) {
        vad.pause();
      }

      // Mark as navigated to prevent re-runs
      hasNavigatedRef.current = true;

      if (
        noConversationFlag === "true" ||
        offensiveFlag === "true" ||
        systemEndedFlag === "true"
      ) {
        // For these cases, clear state so RequireAuth redirects to /video-interview
        // The VideoInterview component will show the appropriate modal
        dispatch({ type: "Clear_all" });
        dispatch({ type: "Reset" });

        // Allow navigation by proceeding blocker
        if (
          blocker &&
          blocker.state === "blocked" &&
          typeof blocker.proceed === "function"
        ) {
          blocker.proceed();
        }
        // Don't navigate here - let RequireAuth handle redirect when state is cleared
      } else {
        // Normal session end (including when interviewer ends via last_node='finished') - navigate to feedback template
        console.log(
          "[DEBUG] Session has ended, navigating to feedback template",
        );
        Navigate("/feedback-template");
      }
    }
  }, [issessiongoing, dispatch, Navigate, blocker]);

  useEffect(() => {
    console.log(
      "[DEBUG] Blocker state changed:",
      blocker?.state,
      "Session going:",
      issessiongoing,
    );
    if (
      blocker &&
      blocker.state === "blocked" &&
      !issessiongoing &&
      typeof blocker.proceed === "function"
    ) {
      blocker.proceed();
    }
  }, [blocker?.state, issessiongoing]);


  useEffect(() => {
    console.log("[DEBUG] [IMPORTANT] micEnabled changed to ", micEnabled);
    if (micEnabled) {
      if (vad?.loading ?? true) {
        console.log("❌ VAD is still loading, cannot toggle mic");
        return;
      }
      if (vad?.pause) {
        console.log("VAD is starting");
        vad.start();
      }
    } else {
      if (vad?.listening) {
        console.log("VAD is stopping");
        vad.pause();
      }
      setIsIntervieweeSpeaking(false);
      setVadConfidence(0);
    }

  }, [micEnabled])

  const handleRecording = async () => {
    console.log("[DEBUG] handleRecording called");
    if (currentAudioRef.current) {
      console.log("[DEBUG] currentAudioRef.current is not null, returning");
      return;
    }
    if (specialSectionMicDisabled) {
      console.log("[DEBUG] specialSectionMicDisabled is true, returning");
      return;
    }
    console.log("FLIPPING THE MIC ENABLED STATE");
    const newMicState = !micEnabled;
    setMicEnabled(newMicState);
  };


  const exportTranscript = () => {
    const transcript = messages
      .map(
        (msg) =>
          `[${msg.timestamp.toLocaleTimeString()}] ${
            msg.type === "ai" ? "Glee" : "You"
          }: ${msg.content}`,
      )
      .join("\n\n");

    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-transcript-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
  };


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = async (
    sessionFinished = null,
    modalAlreadyShown = false,
  ) => {
    try {
      // Stop VAD immediately when ending interview
      if (vad && vad.listening) {
        vad.pause();
      }
      // Also ensure VAD is completely stopped
      if (vad && vad.audioCtx && vad.audioCtx.state !== "closed") {
        try {
          await vad.audioCtx.suspend();
        } catch (err) {
          console.warn("[WARNING] Error suspending VAD audio context:", err);
        }
      }

      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }

      if (messages.length === 1) {
        handleInteviewLeave();
        return;
      }

      if (
        !modalAlreadyShown &&
        !showInterviewEndedModal &&
        !isEndingInterview
      ) {
        if (vad && vad.listening) vad.pause();
        setShowInterviewEndedModal(true);
        setIsEndingInterview(true);
      }

      const sessionid = sessionIdRef.current;
      let interview_type = state.session;
      const duration = sessionDurationRef.current ?? 0;
      let interview_test_id = interviewTypeIdRef.current
        ? parseInt(interviewTypeIdRef.current)
        : null;
      if (interview_type === "Case Study Interview")
        interview_test_id = 35;
      if (interview_type === "Communication Interview")
        interview_test_id = 28;
      if (interview_type === "Debate Interview")
        interview_test_id = 31;
      if (
        interview_type === "Role-Based Interview" ||
        state.videoInterview?.RoleBased?.role
      ) {
        interview_type = "Role-Based Interview";
        if (!interview_test_id) {
          const { RoleBased } = state.videoInterview || {};
          interview_test_id = RoleBased?.interview_type_id
            ? parseInt(RoleBased.interview_type_id)
            : 30;
        }
      }
      if (interview_type === "Company") {
        const idFromState = state.videoInterview?.CompanyWise?.interview_type_id;
        const parsed = idFromState != null ? parseInt(idFromState, 10) : null;
        if (Number.isInteger(parsed)) interview_test_id = parsed;
      }
      if (interview_type === "Subject") {
        const idFromState = state.videoInterview?.SubjectWise?.interview_type_id;
        const parsed = idFromState != null ? parseInt(idFromState, 10) : null;
        if (Number.isInteger(parsed)) interview_test_id = parsed;
      }
      if (interview_test_id != null) {
        const tid = parseInt(interview_test_id, 10);
        if (!Number.isInteger(tid)) interview_test_id = null;
        else interview_test_id = tid;
      }

      const endResponse = await endInterviewAPI({
        sessionId: sessionid,
        interviewType: interview_type,
        interviewTestId: interview_test_id ?? undefined,
        duration,
        sessionFinished: sessionFinished != null ? sessionFinished : true,
      });

      const taskId = endResponse?.task_id;
      if (taskId) {
        const maxAttempts = 60;
        const intervalMs = 5000;
        const pollForFeedback = (attempt = 0) => {
          if (attempt >= maxAttempts) {
            setIsSessiongoing(false);
            return;
          }
          getInterviewFeedbackStatus(taskId)
            .then((statusRes) => {
              if (
                statusRes.status === "completed" ||
                statusRes.status === "failed"
              ) {
                setIsSessiongoing(false);
                return;
              }
              setTimeout(() => pollForFeedback(attempt + 1), intervalMs);
            })
            .catch(() =>
              setTimeout(() => pollForFeedback(attempt + 1), intervalMs),
            );
        };
        pollForFeedback();
      } else {
        setTimeout(() => setIsSessiongoing(false), 1500);
      }
    } catch (err) {
      // document.body.classList.add("opacity-25");
      console.error("Error processing meeting data:", err);
      setShowInterviewEndedModal(false);
      setIsEndingInterview(false);
      // Safeguard: Try to proceed blocker if it exists, but don't let it crash the error handling
      try {
        if (blocker && typeof blocker.proceed === "function") {
          blocker.proceed();
        }
      } catch (blockerError) {
        console.warn("Error proceeding blocker:", blockerError);
      }
      Navigate("/oops-something-wrong");
    }
  };

  const handleInteviewLeave = () => {
    sessionStorage.setItem("interviewEndedNoConversation", "true");
    dispatch({ type: "Clear_all" });
    dispatch({ type: "Reset" });
    setIsSessiongoing(false);
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    document.body.classList.remove("opacity-25");
    // Safeguard: Check if blocker exists and has proceed method
    if (blocker && typeof blocker.proceed === "function") {
      blocker.proceed();
    }
  };

  if (onTakeTour) {
    return (
      <VideoInterviewWalkthrough
        setInterviewStarted={setInterviewStarted}
        setOnTakeTour={setOnTakeTour}
      />
    );
  }

  if (!interviewStarted) {
    return (
      <InterviewDisclaimer
        interviewStarted={interviewStarted}
        setInterviewStarted={setInterviewStarted}
        setOnTakeTour={setOnTakeTour}
      />
    );
  }
  if (!setUpComplete) {
    return (
      <InterviewLoadingPopup
        progress={startProgress}
        setSetUpComplete={setSetUpComplete}
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      {blocker.state === "blocked" ? (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            aria-hidden="true"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 z-50"
          >
            <div className="text-center">
              <h3
                id="dialog-title"
                className="text-lg font-semibold text-gray-900"
              >
                Unsaved Changes
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to leave? Your progress will be lost.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                onClick={handleInteviewLeave}
                className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Leave Page
              </button>
              <button
                onClick={() => blocker.reset()}
                className="w-full px-4 py-2 bg-gray-100 text-gray-800 font-semibold rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Stay
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
      {/* VAD Loading Indicator */}
      {vad.loading && (
        <div className="fixed top-20 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Loading voice detection...</span>
        </div>
      )}

      {/* VAD Error Indicator */}
      {vad.errored && (
        <div className="fixed top-20 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Voice detection error: {vad.errored.message}
        </div>
      )}

      {/* Quality Warning from Backend */}
      {vadErrorDet && (
        <div className="fixed top-20 right-4 bg-orange-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-start space-x-2 max-w-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Audio Quality Issue</p>
            <p className="text-xs mt-1">Too noisy background!</p>
          </div>
        </div>
      )}

      {/* Camera Visibility Warning */}
      {qualityWarning && qualityWarning.framePresent === false && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-start space-x-2 max-w-sm"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">⚠️ Not Visible</p>
            <p className="text-xs mt-1">Please return to the camera view</p>
          </div>
        </motion.div>
      )}

      {/* End Interview Confirmation Modal */}
      <AnimatePresence>
        {showEndInterviewModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowEndInterviewModal(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="end-interview-title"
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 z-50"
            >
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3
                  id="end-interview-title"
                  className="text-lg font-semibold text-gray-900 mb-2"
                >
                  End Interview?
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Are you sure you want to end the interview? Your progress will
                  be saved and you'll be redirected to the feedback page.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowEndInterviewModal(false)}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-800 font-semibold rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowEndInterviewModal(false);
                    handleEndCall(false);
                  }}
                  className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  End Interview
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Interview Ended Modal */}
      <AnimatePresence>
        {showInterviewEndedModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              aria-hidden="true"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="interview-ended-title"
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 z-50"
            >
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3
                  id="interview-ended-title"
                  className="text-lg font-semibold text-gray-900 mb-2"
                >
                  Interview Ended
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  The interview has been completed. You'll be redirected to the
                  feedback page shortly.
                </p>
                <div className="flex items-center justify-center space-x-2 text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  <span className="text-xs">Processing...</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden w-full px-2 sm:px-4 md:px-6 lg:px-8 py-3 md:py-4">
        {/* Header - Professional Minimal Design */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg border border-slate-200/60 p-3 md:p-4 mb-3 md:mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3 md:space-x-6">
              {/* Logo */}
              <img src={Logo} alt="Logo" className="h-7 md:h-8 w-auto" />

              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="relative">
                  <div className="w-2 md:w-2.5 h-2 md:h-2.5 bg-red-500 rounded-full"></div>
                  <div className="absolute inset-0 w-2 md:w-2.5 h-2 md:h-2.5 bg-red-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="text-sm md:text-base font-semibold text-slate-900">
                  Live Interview
                </span>
              </div>
              <div className="hidden md:flex items-center space-x-2 px-2 md:px-3 py-1 md:py-1.5 bg-slate-100 rounded-lg">
                <Clock className="h-3 md:h-4 w-3 md:w-4 text-slate-600" />
                <span className="font-mono text-xs md:text-sm font-medium text-slate-700">
                  {formatTime(sessionDuration)}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3">
              <button
                onClick={exportTranscript}
                className="p-2 md:p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg md:rounded-xl transition-all duration-200"
                title="Export Transcript"
              >
                <Download className="h-4 md:h-5 w-4 md:w-5" />
              </button>

              {/* DEV MODE TOGGLE - Only visible in development */}
             {/* <button
                onClick={toggleDevMode}
                className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-200 ${
                  devMode
                    ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 shadow-sm"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                }`}
                title={devMode ? "Dev Mode: ON (Text-only, no audio)" : "Dev Mode: OFF (Click to enable fast testing)"}
              >
                <Zap className="h-4 md:h-5 w-4 md:w-5" />
              </button>*/}

              <button
                className={`px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm flex items-center space-x-1 md:space-x-2 transition-all duration-200 ${
                  isEndingInterview
                    ? "bg-slate-300 text-white cursor-not-allowed"
                    : "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-md hover:shadow-lg"
                }`}
                onClick={() => setShowEndInterviewModal(true)}
                disabled={isEndingInterview}
              >
                <Square className="h-3 md:h-4 w-3 md:w-4" />
                <span className="hidden sm:inline">End Interview</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-4 min-h-0 overflow-hidden">
          {/* Video Feed - Professional Design */}
          <div className="lg:col-span-1 flex flex-col space-y-3 md:space-y-4 min-h-0 overflow-hidden">
            {/* Glee Interviewer Video */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg border border-slate-200/60 p-3 md:p-4 flex-shrink-0">
              <div className="flex items-center space-x-2 mb-2 md:mb-3">
                <div className="w-7 md:w-8 h-7 md:h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="h-3.5 md:h-4 w-3.5 md:w-4 text-white" />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-slate-900">
                  Glee AI
                </h3>
              </div>
              <div className="relative rounded-lg md:rounded-xl overflow-hidden bg-slate-900 aspect-video shadow-inner flex items-center justify-center">
                {showGleeVideo ? (
                  <video
                    ref={videoRef}
                    src="/Video/WhatsApp Video 2025-01-14 at 11.34.08.mp4"
                    muted
                    loop
                    className="w-full h-full object-contain"
                    playsInline
                    onError={() => setShowGleeVideo(false)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center px-4">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg mb-3">
                      <Bot className="h-7 w-7 md:h-8 md:w-8 text-white" />
                    </div>
                    <p className="text-xs md:text-sm text-slate-100 font-semibold mb-1">
                      Live AI Interviewer
                    </p>
                    <p className="text-[0.65rem] md:text-xs text-slate-300">
                      {isInterviewerSpeaking
                        ? "Glee is speaking..."
                        : isInterviewerThinking
                        ? "Glee is thinking..."
                        : "Glee is ready for your response."}
                    </p>
                  </div>
                )}
                {isInterviewerThinking && (
                  <div className="absolute top-2 md:top-3 right-2 md:right-3">
                    <div className="flex items-center space-x-1 bg-blue-500/90 backdrop-blur-sm px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg shadow-lg">
                      <div className="animate-spin rounded-full h-2 md:h-3 w-2 md:w-3 border-2 border-white border-t-transparent"></div>
                      <span className="text-xs text-white font-semibold">
                        Thinking...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User Video */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg border border-slate-200/60 p-3 md:p-4 flex-shrink-0">
              <div className="flex items-center space-x-2 mb-2 md:mb-3">
                <div className="w-7 md:w-8 h-7 md:h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <User className="h-3.5 md:h-4 w-3.5 md:w-4 text-white" />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-slate-900">
                  You
                </h3>
              </div>
              <div className="relative rounded-lg md:rounded-xl overflow-hidden bg-slate-900 aspect-video mb-2 md:mb-4 shadow-inner">
                <video
                  ref={webcamRef}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
                {!cameraEnabled && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <CameraOff className="h-8 md:h-10 w-8 md:w-10 text-white/60 mb-1 md:mb-2" />
                    <p className="text-xs text-white/60 font-medium">
                      Camera Off
                    </p>
                  </div>
                )}
                {isIntervieweeSpeaking && (
                  <div className="absolute top-2 md:top-3 right-2 md:right-3">
                    <div className="flex items-center space-x-1 bg-green-500/90 backdrop-blur-sm px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg shadow-lg">
                      <div className="w-1.5 md:w-2 h-1.5 md:h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-xs text-white font-semibold">
                        Speaking
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls - Enhanced */}
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-lg md:rounded-xl p-2 md:p-3 border border-slate-200 flex-shrink-0">
                <div className="flex items-center justify-center space-x-1.5 md:space-x-2">
                  <button
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                    className={`p-2 md:p-3 rounded-lg md:rounded-xl transition-all duration-200 ${
                      cameraEnabled
                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm"
                        : "bg-red-50 text-red-600 hover:bg-red-100 shadow-sm"
                    }`}
                    title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
                  >
                    {cameraEnabled ? (
                      <Camera className="h-4 md:h-5 w-4 md:w-5" />
                    ) : (
                      <CameraOff className="h-4 md:h-5 w-4 md:w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => setSpeakerEnabled(!speakerEnabled)}
                    className={`p-2 md:p-3 rounded-lg md:rounded-xl transition-all duration-200 ${
                      speakerEnabled
                        ? "bg-green-50 text-green-600 hover:bg-green-100 shadow-sm"
                        : "bg-red-50 text-red-600 hover:bg-red-100 shadow-sm"
                    }`}
                    title={speakerEnabled ? "Mute speaker" : "Unmute speaker"}
                  >
                    {speakerEnabled ? (
                      <Volume2 className="h-4 md:h-5 w-4 md:w-5" />
                    ) : (
                      <VolumeX className="h-4 md:h-5 w-4 md:w-5" />
                    )}
                  </button>
                  <button
                    onClick={handleRecording}
                    className={`p-2 md:p-3 rounded-lg md:rounded-xl transition-all duration-200 ${
                      micEnabled
                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm"
                        : "bg-red-50 text-red-600 hover:bg-red-100 shadow-sm"
                    }`}
                    title={micEnabled ? "Mute microphone" : "Unmute microphone"}
                  >
                    {micEnabled ? (
                      <Mic className="h-4 md:h-5 w-4 md:w-5" />
                    ) : (
                      <MicOff className="h-4 md:h-5 w-4 md:w-5" />
                    )}
                  </button>
                </div>

                {/* Audio Waveform Visualizer */}
                {micEnabled && (
                  <div className="mt-3 flex items-center justify-center space-x-1 h-8">
                    {[...Array(9)].map((_, i) => {
                      const centerIndex = 4;
                      const distanceFromCenter = Math.abs(i - centerIndex);
                      const isActiveBar = isIntervieweeSpeaking || isUserTurnToSpeak;
                      const baseHeight = isActiveBar
                        ? Math.max(0.15, 1 - distanceFromCenter * 0.15) *
                          Math.max(0.35, vadConfidence)
                        : 0.1;
                      const animationDelay = `${i * 50}ms`;

                      return (
                        <motion.div
                          key={i}
                          className="w-1 rounded-full bg-gradient-to-t from-blue-500 to-purple-500"
                          animate={{
                            height: isIntervieweeSpeaking
                              ? `${Math.max(4, baseHeight * 28)}px`
                              : "4px",
                          }}
                          transition={{
                            duration: 0.1,
                            ease: "easeOut",
                          }}
                          style={{
                            animationDelay,
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Interface - Professional Design */}
          <div
            ref={interfaceRef}
            className="hidden lg:flex lg:col-span-3 flex-col min-h-0 overflow-hidden"
          >
            {/* Chat View */}
            {!showCodeEditor &&
              !(state.session === "Case Study Interview" && showNotes) && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 h-full flex flex-col relative transition-all duration-300 ease-in-out overflow-hidden">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50/50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Interview Conversation
                        </h3>
                        <p className="text-sm text-slate-600 mt-0.5">
                          All responses are being recorded and analyzed
                        </p>
                      </div>
                      {/* Case Study: Notes/Question Toggle */}
                      {state.session === "Case Study Interview" && (
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-slate-200/60 p-1 flex items-center">
                          <div className="flex space-x-1">
                            <motion.button
                              onClick={() => setShowNotes(false)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                                !showNotes
                                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                                  : "text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <User className="h-4 w-4" />
                              <span>Conversation</span>
                              {!showNotes && (
                                <motion.div
                                  layoutId="notesTab"
                                  className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg -z-10"
                                  transition={{
                                    type: "spring",
                                    bounce: 0.2,
                                    duration: 0.6,
                                  }}
                                />
                              )}
                            </motion.button>
                            <motion.button
                              onClick={() => setShowNotes(true)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                                showNotes
                                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                                  : "text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <FileText className="h-4 w-4" />
                              <span>Notes & Question</span>
                              {showNotes && (
                                <motion.div
                                  layoutId="notesTab"
                                  className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg -z-10"
                                  transition={{
                                    type: "spring",
                                    bounce: 0.2,
                                    duration: 0.6,
                                  }}
                                />
                              )}
                            </motion.button>
                          </div>
                        </div>
                      )}
                      {codeEditor && (
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-slate-200/60 p-1 flex items-center">
                          <div className="flex space-x-1">
                            <motion.button
                              onClick={() => setShowCodeEditor(false)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                                !showCodeEditor
                                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                                  : "text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <User className="h-4 w-4" />
                              <span>Conversation</span>
                              {!showCodeEditor && (
                                <motion.div
                                  layoutId="activeTab"
                                  className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg -z-10"
                                  transition={{
                                    type: "spring",
                                    bounce: 0.2,
                                    duration: 0.6,
                                  }}
                                />
                              )}
                            </motion.button>
                            <motion.button
                              onClick={() => setShowCodeEditor(true)}
                              disabled={
                                !isCode &&
                                !(
                                  state.session === "Role-Based Interview" ||
                                  state.session === "Technical Interview" ||
                                  state.session === "Coding Interview" ||
                                  state.session === "Subject" ||
                                  state.session === "Company"
                                )
                              }
                              whileHover={
                                isCode ||
                                state.session === "Role-Based Interview" ||
                                state.session === "Technical Interview" ||
                                state.session === "Coding Interview" ||
                                state.session === "Subject" ||
                                state.session === "Company"
                                  ? { scale: 1.02 }
                                  : { scale: 1 }
                              }
                              whileTap={
                                isCode ||
                                state.session === "Role-Based Interview" ||
                                state.session === "Technical Interview" ||
                                state.session === "Coding Interview" ||
                                state.session === "Subject" ||
                                state.session === "Company"
                                  ? { scale: 0.98 }
                                  : { scale: 1 }
                              }
                              className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                                showCodeEditor &&
                                (isCode ||
                                  state.session === "Role-Based Interview" ||
                                  state.session === "Technical Interview" ||
                                  state.session === "Coding Interview" ||
                                  state.session === "Subject" ||
                                  state.session === "Company")
                                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                                  : isCode ||
                                      state.session ===
                                        "Role-Based Interview" ||
                                      state.session === "Technical Interview" ||
                                      state.session === "Coding Interview" ||
                                      state.session === "Subject" ||
                                      state.session === "Company"
                                    ? "text-slate-600 hover:bg-slate-100"
                                    : "text-slate-400 cursor-not-allowed"
                              }`}
                            >
                              <Code className="h-4 w-4" />
                              <span>Code Editor</span>
                              {showCodeEditor &&
                                (isCode ||
                                  state.session === "Role-Based Interview" ||
                                  state.session === "Technical Interview" ||
                                  state.session === "Coding Interview" ||
                                  state.session === "Subject" ||
                                  state.session === "Company") && (
                                  <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg -z-10"
                                    transition={{
                                      type: "spring",
                                      bounce: 0.2,
                                      duration: 0.6,
                                    }}
                                  />
                                )}
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Messages - Enhanced - Scrollable Container */}
                  <div
                    ref={messagesContainerRef}
                    className="flex-1 h-0 overflow-y-auto overflow-x-hidden p-6 space-y-6 bg-gradient-to-b from-white to-slate-50/30 scroll-smooth"
                    style={{ scrollBehavior: "smooth" }}
                  >
                    {messages.length === 0 && (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-3">
                          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                            <User className="h-8 w-8 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-slate-600 font-medium">
                              Conversation will appear here
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              Start speaking to begin the interview
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Communication Interview Phase Components - Replace chat with round-specific UI */}
                    {state.session === "Communication Interview" &&
                    communicationPhase &&
                    (communicationPhase === "Speaking" ||
                      communicationPhase === "Speaking_after" ||
                      communicationPhase === "Comprehension" ||
                      communicationPhase === "Comprehension_before" ||
                      communicationPhase === "Comprehension_after" ||
                      communicationPhase === "MCQ" ||
                      communicationPhase === "MCQ_after" ||
                      communicationPhase === "Results") ? (
                      <div className="mb-4">
                        {(communicationPhase === "Speaking" ||
                          communicationPhase === "Speaking_after") &&
                          communicationData.speaking && (
                            <SpeakingPhase
                              instruction={
                                communicationData.speaking.instruction
                              }
                              paragraph={communicationData.speaking.paragraph}
                              onSendResponse={sendCommunicationResponse}
                              isRecording={isSpeakingRecording}
                              setIsRecording={setIsSpeakingRecording}
                              isProcessing={isProcessingAudio}
                              feedback={communicationData.speakingFeedback}
                              onSpeakingSubmit={() => {
                                setIsProcessingAudio(true);
                                setCommunicationData((prev) => ({
                                  ...prev,
                                  speakingFeedback: null,
                                }));
                              }}
                            />
                          )}

                        {(communicationPhase === "Comprehension" ||
                          communicationPhase === "Comprehension_before" ||
                          communicationPhase === "Comprehension_after") &&
                          communicationData.comprehension && (
                            <ComprehensionPhase
                              instruction={
                                communicationData.comprehension.instruction
                              }
                              question={
                                communicationData.comprehension.question
                              }
                              onSendResponse={sendCommunicationResponse}
                              isProcessing={isProcessingAudio}
                              feedback={communicationData.comprehensionFeedback}
                              onComprehensionSubmit={() => {
                                setIsProcessingAudio(true);
                                setCommunicationData((prev) => ({
                                  ...prev,
                                  comprehensionFeedback: null,
                                }));
                              }}
                            />
                          )}

                        {(communicationPhase === "MCQ" ||
                          communicationPhase === "MCQ_after") &&
                          communicationData.mcq && (
                            <MCQPhase
                              instruction={communicationData.mcq.instruction}
                              question={communicationData.mcq.question}
                              options={communicationData.mcq.options}
                              questionNumber={communicationData.mcqCount}
                              totalQuestions={4}
                              onSendResponse={sendCommunicationResponse}
                              onMCQSubmit={() => setIsProcessingAudio(true)}
                              feedback={communicationData.mcqFeedback}
                              onFeedbackClear={() => {
                                setCommunicationData(prev => ({
                                  ...prev,
                                  mcqFeedback: null,
                                }));
                              }}
                            />
                          )}

                        {(() => {
                          const showResults =
                            communicationPhase === "Results" &&
                            communicationData.mcqResults;
                          // console.log("[RENDER] MCQResults render check:", {
                          //   communicationPhase,
                          //   hasResults: !!communicationData.mcqResults,
                          //   showResults,
                          //   resultsCount: communicationData.mcqResults?.length
                          // });
                          return showResults ? (
                            <MCQResults
                              results={communicationData.mcqResults}
                              onFinishInterview={() => {
                                console.log(
                                  "[INFO] User clicked Finish Interview from MCQ Results",
                                );
                                // Stop VAD immediately when ending interview
                                if (vad && vad.listening) {
                                  vad.pause();
                                }
                                setShowInterviewEndedModal(true);
                                setIsEndingInterview(true);
                                // End the interview after a short delay
                                setTimeout(() => {
                                  handleEndCall(true, true);
                                }, 1500);
                              }}
                            />
                          ) : null;
                        })()}
                      </div>
                    ) : (
                      // Show regular chat messages only for Greeting/Rapport phases
                      messages.map((message, index) => (
                        <motion.div
                          key={message.id}
                          ref={
                            index === messages.length - 1
                              ? messagesEndRef
                              : null
                          }
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`flex items-start space-x-3 max-w-[85%] sm:max-w-[75%] ${
                              message.type === "user"
                                ? "flex-row-reverse space-x-reverse"
                                : ""
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                                message.type === "user"
                                  ? "bg-blue-600"
                                  : "bg-gradient-to-br from-blue-500 to-purple-600"
                              }`}
                            >
                              {message.type === "user" ? (
                                <User className="h-5 w-5 text-white" />
                              ) : (
                                <Bot className="h-5 w-5 text-white" />
                              )}
                            </div>
                            <div
                              className={`rounded-2xl px-5 py-4 shadow-sm ${
                                message.type === "user"
                                  ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white"
                                  : "bg-white border border-slate-200 text-slate-900"
                              }`}
                            >
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => (
                                      <p className="mb-2 last:mb-0 leading-relaxed">
                                        {children}
                                      </p>
                                    ),
                                    code: ({ children }) => (
                                      <code
                                        className={`px-1.5 py-0.5 rounded text-xs ${
                                          message.type === "user"
                                            ? "bg-blue-500/30 text-blue-50"
                                            : "bg-slate-100 text-slate-800"
                                        }`}
                                      >
                                        {children}
                                      </code>
                                    ),
                                  }}
                                >
                                  {message.content === currentMessage
                                    ? typedMessage
                                    : message.content}
                                </ReactMarkdown>
                              </div>
                              <div
                                className={`flex items-center justify-end mt-3 text-xs ${
                                  message.type === "user"
                                    ? "text-blue-100"
                                    : "text-slate-500"
                                }`}
                              >
                                <span className="font-medium">
                                  {message.timestamp.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}

                    {isIntervieweeSpeaking && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex justify-end"
                      >
                        <div className="flex items-start space-x-3 max-w-[85%] sm:max-w-[75%] flex-row-reverse space-x-reverse">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-600 shadow-md">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div className="rounded-2xl px-5 py-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm">
                            <div className="flex items-center space-x-2">
                              <div className="flex space-x-1">
                                <div
                                  className="w-2 h-2 bg-white/80 rounded-full animate-bounce"
                                  style={{ animationDelay: "0ms" }}
                                ></div>
                                <div
                                  className="w-2 h-2 bg-white/80 rounded-full animate-bounce"
                                  style={{ animationDelay: "150ms" }}
                                ></div>
                                <div
                                  className="w-2 h-2 bg-white/80 rounded-full animate-bounce"
                                  style={{ animationDelay: "300ms" }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">
                                Speaking...
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {!isIntervieweeSpeaking && isUserTurnToSpeak && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex justify-end"
                      >
                        <div className="flex items-start space-x-3 max-w-[85%] sm:max-w-[75%] flex-row-reverse space-x-reverse">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-600 shadow-md">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div className="rounded-2xl px-5 py-4 bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-sm">
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <div className="w-3 h-3 rounded-full bg-blue-200 animate-ping" />
                                <div className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full bg-white" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold">
                                  Your turn to speak
                                </span>
                                <span className="text-xs text-blue-50/90">
                                  Answer the question in your own words.
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {isInterviewerThinking && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex justify-start"
                      >
                        <div className="flex items-start space-x-3 max-w-[85%] sm:max-w-[75%]">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 shadow-md">
                            <Bot className="h-5 w-5 text-white" />
                          </div>
                          <div className="rounded-2xl px-5 py-4 bg-white border border-slate-200 text-slate-900 shadow-sm">
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                              <span className="text-sm font-medium">
                                {interviewerCurrentProcess.current}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {/* Scroll anchor for auto-scroll */}
                    <div ref={messagesEndRef} className="h-1" />
                  </div>

                  {/* DEV MODE: Text Input Area */}
                 {/* {devMode && ( 
                    <div className="border-t border-slate-200 bg-gradient-to-r from-yellow-50/50 to-amber-50/50 p-4 flex-shrink-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        <span className="text-xs font-semibold text-yellow-700">
                          DEV MODE: Text-only (no audio)
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={devTextInput}
                          onChange={(e) => setDevTextInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !isProcessingAudio) {
                              e.preventDefault();
                              sendDevTextResponse();
                            }
                          }}
                          placeholder="Type your response and press Enter..."
                          disabled={isProcessingAudio}
                          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                        <button
                          onClick={sendDevTextResponse}
                          disabled={!devTextInput.trim() || isProcessingAudio}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center space-x-2 transition-all duration-200 ${
                            !devTextInput.trim() || isProcessingAudio
                              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:from-yellow-600 hover:to-amber-600 shadow-md"
                          }`}
                        >
                          <Send className="h-4 w-4" />
                          <span>Send</span>
                        </button>
                      </div>
                    </div>
                  )} */}
                </div>
              )}

            {/* Case Study: Notes & Question View */}
            {state.session === "Case Study Interview" && showNotes && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 h-full flex flex-col overflow-hidden">
                {/* Notes Header */}
                <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50/50 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Case Study Notes
                      </h3>
                      <p className="text-xs text-slate-500">
                        Take notes during your interview
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-slate-200/60 p-1 flex items-center">
                    <div className="flex space-x-1">
                      <motion.button
                        onClick={() => setShowNotes(false)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                          !showNotes
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <User className="h-4 w-4" />
                        <span>Conversation</span>
                      </motion.button>
                      <motion.button
                        onClick={() => setShowNotes(true)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                          showNotes
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <FileText className="h-4 w-4" />
                        <span>Notes & Question</span>
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Case Study Question Display */}
                {caseStudyQuestion && (
                  <div className="p-4 border-b border-slate-200 bg-gradient-to-br from-blue-50/50 to-purple-50/50 flex-shrink-0">
                    <div className="flex items-start space-x-2 mb-2">
                      <Bot className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">
                          Case Study Question
                        </h4>
                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {caseStudyQuestion}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes Textarea */}
                <div className="flex-1 p-4 overflow-hidden flex flex-col">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Write your notes, thoughts, and key points here..."
                    className="w-full h-full resize-none border border-slate-200 rounded-lg p-4 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
              </div>
            )}

            {/* Code Editor View - Below Chat */}
            {showCodeEditor &&
              (isCode ||
                state.session === "Role-Based Interview" ||
                state.session === "Technical Interview" ||
                state.session === "Coding Interview" ||
                state.session === "Subject" ||
                state.session === "Company") && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 h-full flex flex-col overflow-hidden">
                  {/* Code Editor Header */}
                  <div className="p-3 md:p-4 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50/50 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className="w-7 md:w-8 h-7 md:h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Code className="h-3.5 md:h-4 w-3.5 md:w-4 text-white" />
                      </div>
                      <div className="hidden sm:block">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Code Editor
                        </h3>
                        <p className="text-xs text-slate-500">
                          Write and test your solution
                        </p>
                      </div>
                    </div>
                    {codeEditor && (
                      <div className="bg-white/80 backdrop-blur-sm rounded-lg md:rounded-xl shadow-md border border-slate-200/60 p-0.5 md:p-1 flex items-center gap-0.5 md:gap-1">
                        <div className="flex space-x-0.5 md:space-x-1">
                          <motion.button
                            onClick={() => setShowCodeEditor(false)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-300 ${
                              !showCodeEditor
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <User className="h-3 md:h-4 w-3 md:w-4" />
                            <span className="hidden sm:inline">
                              Conversation
                            </span>
                            {!showCodeEditor && (
                              <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg -z-10"
                                transition={{
                                  type: "spring",
                                  bounce: 0.2,
                                  duration: 0.6,
                                }}
                              />
                            )}
                          </motion.button>
                          <motion.button
                            onClick={() => setShowCodeEditor(true)}
                            disabled={
                              !isCode &&
                              !(
                                state.session === "Role-Based Interview" ||
                                state.session === "Technical Interview" ||
                                state.session === "Coding Interview" ||
                                state.session === "Subject" ||
                                state.session === "Company"
                              )
                            }
                            whileHover={
                              isCode ||
                              state.session === "Role-Based Interview" ||
                              state.session === "Technical Interview" ||
                              state.session === "Coding Interview" ||
                              state.session === "Subject" ||
                              state.session === "Company"
                                ? { scale: 1.02 }
                                : { scale: 1 }
                            }
                            whileTap={
                              isCode ||
                              state.session === "Role-Based Interview" ||
                              state.session === "Technical Interview" ||
                              state.session === "Coding Interview" ||
                              state.session === "Subject" ||
                              state.session === "Company"
                                ? { scale: 0.98 }
                                : { scale: 1 }
                            }
                            className={`relative flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-300 ${
                              showCodeEditor &&
                              (isCode ||
                                state.session === "Role-Based Interview" ||
                                state.session === "Technical Interview" ||
                                state.session === "Coding Interview" ||
                                state.session === "Subject" ||
                                state.session === "Company")
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                                : isCode ||
                                    state.session === "Role-Based Interview" ||
                                    state.session === "Technical Interview" ||
                                    state.session === "Coding Interview" ||
                                    state.session === "Subject" ||
                                    state.session === "Company"
                                  ? "text-slate-600 hover:bg-slate-100"
                                  : "text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            <Code className="h-3 md:h-4 w-3 md:w-4" />
                            <span className="hidden sm:inline">
                              Code Editor
                            </span>
                            {showCodeEditor && isCode && (
                              <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg -z-10"
                                transition={{
                                  type: "spring",
                                  bounce: 0.2,
                                  duration: 0.6,
                                }}
                              />
                            )}
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Code Editor - Monaco */}
                  <div className="relative w-full flex-1 p-4 bg-white min-h-0 overflow-hidden">
                    <div
                      ref={codeAreaRef}
                      className={`rounded-lg w-full h-full border-2 border-solid ${isAnalyzing ? "border-blue-400" : "border-transparent"} overflow-hidden transition-colors`}
                    >
                      <div className="w-full h-full bg-slate-50 rounded-lg overflow-hidden">
                        <Editor
                          height="100%"
                          defaultLanguage="javascript"
                          theme="vs-light"
                          value={code}
                          onChange={(value) => setCode(value || "")}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: "on",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 2,
                            wordWrap: "on",
                            padding: { top: 16, bottom: 16 },
                            renderLineHighlight: "none",
                            overviewRulerLanes: 0,
                            hideCursorInOverviewRuler: true,
                            overviewRulerBorder: false,
                            scrollbar: {
                              vertical: "auto",
                              horizontal: "auto",
                              verticalScrollbarSize: 8,
                              horizontalScrollbarSize: 8,
                            },
                          }}
                        />
                        {isAnalyzing && (
                          <div className="absolute top-4 right-4 bg-yellow-500/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 shadow-lg z-10">
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                            <span>Analyzing...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* ── Free-tier 5-minute warning toast ─────────────────────────────── */}
      <AnimatePresence>
        {showFiveMinWarning && (
          <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-amber-50 border border-amber-300 rounded-2xl shadow-xl p-4 flex items-start gap-3">
              <span className="text-xl">⏳</span>
              <div className="flex-1">
                <p className="font-semibold text-amber-800 text-sm">Only 5 minutes remaining</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Upgrade to Basic or Pro for unlimited interview time.
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setShowFiveMinWarning(false); setShowUpgradeFromTimer(true); }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Upgrade Now
                  </button>
                  <button
                    onClick={() => setShowFiveMinWarning(false)}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Free-tier upgrade modal (from 5-min CTA) ─────────────────────── */}
      <UpgradeModal
        isOpen={showUpgradeFromTimer}
        onClose={() => setShowUpgradeFromTimer(false)}
        currentTier={planStatus?.tier ?? 0}
        context="time"
        onSuccess={() => {
          setShowUpgradeFromTimer(false);
          setPlanStatus((prev) => prev ? { ...prev, has_time_limit: false } : prev);
        }}
      />

      {/* ── Free-tier 10-minute hard-stop modal (non-dismissable) ─────────── */}
      <FreeSessionEndedModal
        isOpen={showFreeEndedModal}
        feedbackReady={freeEndFeedbackReady}
        onUpgradeSuccess={(data) => {
          // Feedback may still be processing — navigate immediately after upgrade
          // FeedbackRouter will poll until it's ready
          setShowFreeEndedModal(false);
          hasNavigatedRef.current = true;
          Navigate('/feedback-template');
        }}
        onContinueToFeedback={() => {
          if (!freeEndFeedbackReady) return;
          setShowFreeEndedModal(false);
          hasNavigatedRef.current = true;
          Navigate('/feedback-template');
        }}
      />
    </div>
  );
};

export default InterviewInterface;
