import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Calendar, Target, Users, Code, Brain, Mic, MessageSquare, Award,
} from 'lucide-react';
import api from '../../service/api';
import { djangoClient } from '../../api/client';
import { useVideoInterview } from '../../Contexts/VideoInterviewContext';

// Interview-type-specific templates
import TechnicalFeedbackTemplate from './TechnicalFeedbackTemplate';
import HRFeedbackTemplate from './HRFeedbackTemplate';
import CaseStudyFeedbackTemplate from './CaseStudyFeedbackTemplate';
import CommunicationFeedbackTemplate from './CommunicationFeedbackTemplate';
import DebateFeedbackTemplate from './DebateFeedbackTemplate';

// ─────────────────────────────────────────────
//  Type routing map
// ─────────────────────────────────────────────
const TECHNICAL_TYPES = ['Technical Interview', 'Coding Interview', 'Role-Based Interview', 'Company', 'Subject'];
const HR_TYPES = ['HR Interview'];
const CASE_STUDY_TYPES = ['Case Study Interview'];
const COMMUNICATION_TYPES = ['Communication Interview'];
const DEBATE_TYPES = ['Debate Interview'];

const INTERVIEW_META = {
  'Technical Interview':     { icon: Code,         color: 'from-orange-500 to-red-600',     label: 'Technical Interview' },
  'Coding Interview':        { icon: Code,         color: 'from-orange-500 to-red-600',     label: 'Coding Interview' },
  'Role-Based Interview':    { icon: Code,         color: 'from-indigo-500 to-purple-600',  label: 'Role-Based Interview' },
  'Company':                 { icon: Code,         color: 'from-orange-500 to-red-600',     label: 'Company Interview' },
  'Subject':                 { icon: Code,         color: 'from-orange-500 to-red-600',     label: 'Subject Interview' },
  'HR Interview':            { icon: Users,        color: 'from-green-500 to-teal-600',     label: 'HR Interview' },
  'Case Study Interview':    { icon: Brain,        color: 'from-amber-500 to-yellow-600',   label: 'Case Study Interview' },
  'Communication Interview': { icon: Mic,          color: 'from-cyan-500 to-blue-600',      label: 'Communication Interview' },
  'Debate Interview':        { icon: MessageSquare, color: 'from-red-500 to-rose-600',      label: 'Debate Interview' },
  'General Interview':       { icon: Target,       color: 'from-blue-500 to-purple-600',    label: 'General Interview' },
};

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
const resolveInterviewType = (responseData, sessionType) => {
  let type = responseData?.interview_test_details?.interview_mode;

  // Explicit Communication/Debate from session state
  if (sessionType === 'Communication Interview') return 'Communication Interview';
  if (sessionType === 'Debate Interview') return 'Debate Interview';

  if (responseData?.interview_type_display) {
    type = responseData.interview_type_display;
  }

  if (type === 'Coding Interview') return 'Coding Interview';

  const valid = [
    'General Interview', 'HR Interview', 'Technical Interview',
    'Case Study Interview', 'Communication Interview', 'Debate Interview', 'Role-Based Interview',
  ];

  if (!type || typeof type !== 'string' || !valid.includes(type)) {
    return sessionType || 'General Interview';
  }

  return type;
};

const buildAllScores = (data) => {
  try {
    const all = [];
    for (const key of Object.keys(data.detailed_scores || {})) {
      for (const factor of Object.keys(data.detailed_scores[key]?.breakdown || {})) {
        all.push({ [factor]: data.detailed_scores[key].breakdown[factor] });
      }
    }
    return all;
  } catch {
    return [];
  }
};

// ─────────────────────────────────────────────
//  Loading skeleton
// ─────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-4">
    <div className="animate-pulse space-y-8 w-full">
      <div className="h-10 bg-gray-200 rounded-2xl w-1/3" />
      <div className="grid lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded-3xl" />
        ))}
      </div>
      <div className="h-80 bg-gray-200 rounded-3xl" />
      <div className="h-64 bg-gray-200 rounded-3xl" />
    </div>
  </div>
);

// ─────────────────────────────────────────────
//  Header
// ─────────────────────────────────────────────
const FeedbackHeader = ({ selectedType, feedbackData, navigate }) => {
  const meta = INTERVIEW_META[selectedType] || INTERVIEW_META['General Interview'];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-[2.5rem]"
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${meta.color} opacity-10 rounded-[2.5rem]`} />
      <div className={`relative bg-gradient-to-br from-white via-gray-50/80 to-white rounded-[2.5rem] shadow-2xl border-2 border-gray-200/60 p-8 backdrop-blur-sm`}>
        {/* Back button */}
        <motion.button
          whileHover={{ x: -5 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </motion.button>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className={`relative w-20 h-20 rounded-3xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-2xl`}>
              <Icon className="text-white" size={36} />
            </div>
            <div>
              <h1 className={`text-4xl font-extrabold bg-gradient-to-r ${meta.color} bg-clip-text text-transparent`}>
                {meta.label}
              </h1>
              <p className="text-gray-600 font-medium mt-1">
                {feedbackData?.interview_test_details?.interview_title || 'Interview Feedback Report'}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-gray-500 text-sm">
                  <Calendar size={14} />
                  <span>{feedbackData?.interview_test_details?.created_at
                    ? new Date(feedbackData.interview_test_details.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'Recent Session'}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${meta.color} text-white shadow-md`}>
                  {meta.label}
                </span>
              </div>
            </div>
          </div>

          {/* Overall Score badge */}
          <div className="flex flex-col items-center bg-white/80 rounded-3xl px-8 py-5 border-2 border-gray-100 shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <Award className="text-amber-500" size={20} />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Overall Score</span>
            </div>
            <div className={`text-6xl font-black bg-gradient-to-r ${meta.color} bg-clip-text text-transparent`}>
              {Math.trunc(feedbackData?.overall_score || 0)}%
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
//  Main router component
// ─────────────────────────────────────────────
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

const FeedbackRouter = ({ interview_id = null, interview_type = null }) => {
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');
  const [feedbackData, setFeedbackData] = useState({});
  const [pending, setPending] = useState(false);
  const [canAccessFullFeedback, setCanAccessFullFeedback] = useState(false);
  const [feedbackAccessTier, setFeedbackAccessTier] = useState(0);
  const pollRef = useRef(null);
  const { state } = useVideoInterview();
  const navigate = useNavigate();

  const getParams = () => {
    if (interview_id && interview_type) {
      return { params: { interview_id, interview_type } };
    }
    let sessionType = state.session;
    if (sessionType === 'Coding Interview') sessionType = 'Technical Interview';
    return { params: { session_id: state.redixsession, session_type: sessionType } };
  };

  const applyResponse = (data, requestedType) => {
    if (!data) return;
    const next = { ...data };
    next.allScores = buildAllScores(next);
    setFeedbackData(next);
    setSelectedType(resolveInterviewType(next, requestedType));
    setPending(next.status === 'pending');
  };

  const fetchFeedbackAccess = async () => {
    try {
      const { data } = await djangoClient.get('billing/feedback-access/');
      setCanAccessFullFeedback(data.can_access_full_feedback);
      setFeedbackAccessTier(data.tier ?? 0);
    } catch {
      // Default to locked on error — safe fallback
      setCanAccessFullFeedback(false);
    }
  };

  useEffect(() => {
    sessionStorage.setItem('refreshDashboard', 'true');

    const fetchFeedbackData = async () => {
      try {
        const requestedType = interview_type || state.session;
        const [response] = await Promise.all([
          api.get('get-session-history/', getParams()),
          fetchFeedbackAccess(),
        ]);
        if (!response?.data) throw new Error('Invalid response: missing data');
        applyResponse(response.data, requestedType);
      } catch (err) {
        console.error('Error fetching feedback data:', err);
        const fallbackType = interview_type || state.session || 'General Interview';
        setSelectedType(fallbackType);
        setFeedbackData({
          overall_score: 0,
          detailed_scores: {},
          feedback_summary: { strengths: [], areas_of_improvements: [] },
          interaction_log: [],
          interview_test_details: {},
        });
        setPending(false);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbackData();
  }, []);

  useEffect(() => {
    if (!pending) return;
    let attempts = 0;
    const requestedType = interview_type || state.session;

    const poll = async () => {
      if (attempts >= MAX_POLL_ATTEMPTS) {
        setPending(false);
        return;
      }
      attempts += 1;
      try {
        const response = await api.get('get-session-history/', getParams());
        if (response?.data && response.data.status !== 'pending') {
          if (pollRef.current) clearTimeout(pollRef.current);
          pollRef.current = null;
          applyResponse(response.data, requestedType);
          return;
        }
      } catch (_) {}
      pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [pending]);

  if (loading) return <LoadingSkeleton />;

  const sharedProps = {
    canAccessFullFeedback,
    currentTier: feedbackAccessTier,
    onUnlock: fetchFeedbackAccess,
  };

  const renderTemplate = () => {
    if (TECHNICAL_TYPES.includes(selectedType)) {
      return <TechnicalFeedbackTemplate feedbackData={feedbackData} interviewType={selectedType} {...sharedProps} />;
    }
    if (HR_TYPES.includes(selectedType)) {
      return <HRFeedbackTemplate feedbackData={feedbackData} {...sharedProps} />;
    }
    if (CASE_STUDY_TYPES.includes(selectedType)) {
      return <CaseStudyFeedbackTemplate feedbackData={feedbackData} {...sharedProps} />;
    }
    if (COMMUNICATION_TYPES.includes(selectedType)) {
      return <CommunicationFeedbackTemplate feedbackData={feedbackData} {...sharedProps} />;
    }
    if (DEBATE_TYPES.includes(selectedType)) {
      return <DebateFeedbackTemplate feedbackData={feedbackData} {...sharedProps} />;
    }
    return <TechnicalFeedbackTemplate feedbackData={feedbackData} interviewType={selectedType} {...sharedProps} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-8">
      <div className="w-full px-4 sm:px-4 space-y-8">
        <FeedbackHeader
          selectedType={selectedType}
          feedbackData={feedbackData}
          navigate={navigate}
        />
        {renderTemplate()}
      </div>
    </div>
  );
};

export default FeedbackRouter;
