import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Mic, BookOpen, Brain } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { MetricCard } from './shared/MetricCards';
import ScoreBreakdown from './shared/ScoreBreakdown';
import TranscriptViewer from './shared/TranscriptViewer';
import StrengthsAndImprovements from './shared/StrengthsAndImprovements';
import RadialGauge from '../ResumeAnalysis/RadialGauge';
import LockedSection from './shared/LockedSection';

/**
 * CommunicationFeedbackTemplate
 * For: Communication Interview
 *
 * Expected feedbackData shape:
 *   overall_score
 *   detailed_scores.{Speaking Skills, Comprehension Skills}.{score, breakdown}
 *   feedback_summary.{strengths, areas_of_improvements}
 *   sub_scores.{Speaking Skills, Comprehension Skills}.{percentile}
 *   interaction_log, interaction_status_log
 *   mcq_results (optional): [{ question, user_answer, correct_answer, is_correct }]
 */
const CommunicationFeedbackTemplate = ({ feedbackData = {}, canAccessFullFeedback = true, currentTier = 0, onUnlock }) => {
  const overallScore = Math.trunc(feedbackData?.overall_score || 0);
  const detailedScores = feedbackData?.detailed_scores || {};
  const feedbackSummary = feedbackData?.feedback_summary || {};
  const subScores = feedbackData?.sub_scores || {};

  // Try both "Speaking" and "Speaking Skills" for backward compatibility
  const speakingDetails = detailedScores['Speaking'] || detailedScores['Speaking Skills'] || {};
  const comprehensionDetails = detailedScores['Comprehension'] || detailedScores['Comprehension Skills'] || {};

  // Build transcript
  const buildTranscript = () => {
    const log = feedbackData?.interaction_log || [];
    const statusLog = feedbackData?.interaction_status_log || [];
    return log.map((entry, index) => {
      if (entry.question) {
        return { id: index, speaker: 'Interviewer', text: entry.question, timestamp: entry.timestamp || '' };
      }
      const qIndex = Math.floor(index / 2);
      const status = statusLog[qIndex];
      return {
        id: index,
        speaker: 'Candidate',
        text: entry.answer || '',
        timestamp: entry.timestamp || '',
        score: status?.answer_status || '',
        feedback: status?.comment || '',
      };
    });
  };

  const transcript = buildTranscript();

  const speakingCategories = [
    { name: 'Fluency', score: speakingDetails?.breakdown?.['Fluency'] ?? speakingDetails?.breakdown?.fluency_score ?? 0, feedback: 'Smooth and uninterrupted speech' },
    { name: 'Pronunciation', score: speakingDetails?.breakdown?.['Pronunciation'] ?? speakingDetails?.breakdown?.pronunciation_score ?? 0, feedback: 'Accuracy of word pronunciation' },
    { name: 'Vocabulary', score: speakingDetails?.breakdown?.['Vocabulary Range'] ?? speakingDetails?.breakdown?.vocabulary_range_score ?? 0, feedback: 'Range and appropriateness of words' },
    { name: 'Sentence Structure', score: speakingDetails?.breakdown?.['Sentence Construction'] ?? speakingDetails?.breakdown?.sentence_construction_score ?? 0, feedback: 'Grammar and sentence construction' },
  ];

  const comprehensionCategories = [
    { name: 'Listening', score: comprehensionDetails?.breakdown?.['Listening Comprehension'] ?? comprehensionDetails?.breakdown?.listening_comprehension_score ?? 0, feedback: 'Active listening skills' },
    { name: 'Reading', score: comprehensionDetails?.breakdown?.['Reading Comprehension'] ?? comprehensionDetails?.breakdown?.reading_comprehension_score ?? 0, feedback: 'Text comprehension ability' },
    { name: 'Context', score: comprehensionDetails?.breakdown?.['Contextual Understanding'] ?? comprehensionDetails?.breakdown?.contextual_understanding_score ?? 0, feedback: 'Understanding contextual meaning' },
    { name: 'Relevance', score: comprehensionDetails?.breakdown?.['Response Relevance'] ?? comprehensionDetails?.breakdown?.response_relevance_score ?? 0, feedback: 'Relevance of answers to questions' },
  ];

  const speakingPercentile = Math.round(subScores['Speaking']?.percentile || subScores['Speaking Skills']?.percentile || 0);
  const comprehensionPercentile = Math.round(subScores['Comprehension']?.percentile || subScores['Comprehension Skills']?.percentile || 0);

  const strengths = feedbackSummary?.strengths || [];
  const improvements = feedbackSummary?.areas_of_improvements || feedbackSummary?.areas_of_improvement || [];

  // MCQ Summary
  const mcqResults = feedbackData?.mcq_results || [];
  const mcqCorrect = mcqResults.filter(r => r.is_correct).length;
  const mcqTotal = mcqResults.length;
  const mcqPercentage = mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 100) : 0;

  const mcqPieData = [
    { name: 'Correct', value: mcqCorrect, color: '#10b981' },
    { name: 'Incorrect', value: mcqTotal - mcqCorrect, color: '#f87171' },
  ];

  const confidenceScore = Math.round(feedbackData?.soft_skill_summary?.confidence || overallScore);

  return (
    <div className="space-y-8 px-2 sm:px-4 pb-12">

      {/* ROW 1: Metric Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <MetricCard label="Overall Score" value={`${overallScore}%`} icon={Target} bgColor="bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-600" />
        <MetricCard label="Speaking Skills" value={`${Math.trunc(speakingDetails?.score || 0)}%`} icon={Mic} bgColor="bg-gradient-to-br from-teal-600 via-green-600 to-emerald-600" />
        <MetricCard label="Comprehension" value={`${Math.trunc(comprehensionDetails?.score || 0)}%`} icon={BookOpen} bgColor="bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600" />
      </motion.div>

      {/* ROW 2: AI Performance Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-sky-500/20 to-blue-500/20 rounded-[2.5rem] blur-3xl -z-10 animate-pulse" />
        <div className="bg-gradient-to-br from-white via-cyan-50/40 to-sky-50/30 rounded-[2.5rem] shadow-2xl border-2 border-cyan-200/60 p-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="text-white" size={28} />
            </div>
            <div>
              <h3 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 bg-clip-text text-transparent">
                Communication Assessment
              </h3>
              <p className="text-gray-600 text-base mt-1 font-medium">Speaking proficiency and comprehension readiness</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 items-center max-w-md mx-auto">
            {[
              { score: confidenceScore, label: 'Communication Confidence', sub: 'AI Assessment', color: '#06b6d4' },
            ].map((g, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="bg-white/90 rounded-3xl p-8 border-2 border-gray-100 shadow-xl flex flex-col items-center">
                <RadialGauge score={g.score} label={g.label} subLabel={g.sub} color={g.color} size={160} />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ROW 3: MCQ Summary (only if MCQ data present) */}
      {mcqTotal > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-green-500/10 to-emerald-500/10 rounded-[2.5rem] blur-3xl -z-10" />
          <div className="bg-gradient-to-br from-white via-teal-50/40 to-green-50/30 rounded-[2.5rem] shadow-2xl border-2 border-teal-200/60 p-10 relative overflow-hidden">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="text-white" size={28} />
              </div>
              <div>
                <h3 className="text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">
                  MCQ Comprehension Summary
                </h3>
                <p className="text-gray-600 mt-1 font-medium">Reading and listening comprehension test results</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
              {/* Pie Chart */}
              <div className="bg-white/80 rounded-3xl p-6 border-2 border-teal-200/40 shadow-xl flex flex-col items-center">
                <h4 className="text-lg font-bold text-teal-700 mb-4">Accuracy Overview</h4>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-4xl font-extrabold text-teal-600">{mcqPercentage}%</span>
                  <span className="text-gray-500 font-semibold">accuracy</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={mcqPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {mcqPieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Question-by-question list */}
              <div className="bg-white/80 rounded-3xl p-6 border-2 border-teal-200/40 shadow-xl max-h-80 overflow-y-auto">
                <h4 className="text-lg font-bold text-teal-700 mb-4">Question Breakdown</h4>
                <div className="space-y-3">
                  {mcqResults.map((result, index) => (
                    <div key={index} className={`p-3 rounded-2xl border-2 ${result.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${result.is_correct ? 'bg-green-500' : 'bg-red-500'}`}>
                          <span className="text-white text-xs font-bold">{result.is_correct ? '✓' : '✗'}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-600">Q{index + 1}</span>
                      </div>
                      <p className="text-xs text-gray-700 mb-1">{result.question}</p>
                      <div className="flex gap-4 text-xs">
                        <span className="text-green-700">Answer: {result.correct_answer}</span>
                        {!result.is_correct && <span className="text-red-700">You said: {result.user_answer}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <LockedSection isLocked={!canAccessFullFeedback} title="Speaking Skills Breakdown" currentTier={currentTier} onUnlock={onUnlock}>
        <ScoreBreakdown
          title="Speaking Skills"
          subtitle="Fluency, pronunciation, vocabulary, and sentence construction"
          gradientFrom="from-teal-600"
          gradientTo="to-cyan-600"
          borderColor="border-teal-200/60"
          bgFrom="from-white"
          bgVia="via-teal-50/40"
          bgTo="to-cyan-50/30"
          glowFrom="from-teal-500/10"
          glowVia="via-cyan-500/10"
          glowTo="to-sky-500/10"
          radarStroke="#14b8a6"
          radarFill="#14b8a6"
          radarGrid="#99f6e4"
          radarTick="#134e4a"
          categories={speakingCategories}
        />
      </LockedSection>

      <LockedSection isLocked={!canAccessFullFeedback} title="Comprehension Skills Breakdown" currentTier={currentTier} onUnlock={onUnlock}>
        <ScoreBreakdown
          title="Comprehension Skills"
          subtitle="Listening, reading, contextual understanding, and response relevance"
          gradientFrom="from-orange-600"
          gradientTo="to-amber-600"
          borderColor="border-orange-200/60"
          bgFrom="from-white"
          bgVia="via-orange-50/40"
          bgTo="to-amber-50/30"
          glowFrom="from-orange-500/10"
          glowVia="via-amber-500/10"
          glowTo="to-yellow-500/10"
          radarStroke="#f97316"
          radarFill="#f97316"
          radarGrid="#fed7aa"
          radarTick="#7c2d12"
          categories={comprehensionCategories}
        />
      </LockedSection>

      <LockedSection isLocked={!canAccessFullFeedback} title="Strengths & Improvements" currentTier={currentTier} onUnlock={onUnlock}>
        <StrengthsAndImprovements
          strengths={strengths}
          improvements={improvements}
          recommendations={[
            'Practice speaking in English for at least 30 minutes daily',
            'Listen to podcasts and try to summarize what you heard',
            'Read articles aloud to improve pronunciation and fluency',
            'Expand vocabulary by learning 5 new words per day',
          ]}
        />
      </LockedSection>

      <LockedSection isLocked={!canAccessFullFeedback} title="Interview Transcript" currentTier={currentTier} onUnlock={onUnlock}>
        <TranscriptViewer transcript={transcript} />
      </LockedSection>
    </div>
  );
};

export default CommunicationFeedbackTemplate;
