import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Award, Star, Code, Brain } from 'lucide-react';
import { MetricCard } from './shared/MetricCards';
import ScoreBreakdown from './shared/ScoreBreakdown';
import DetailedScoreBars from './shared/DetailedScoreBars';
import ResponseAnalysis from './shared/ResponseAnalysis';
import TranscriptViewer from './shared/TranscriptViewer';
import StrengthsAndImprovements from './shared/StrengthsAndImprovements';
import RadialGauge from '../ResumeAnalysis/RadialGauge';
import LockedSection from './shared/LockedSection';

/**
 * TechnicalFeedbackTemplate
 * For: Technical Interview, Coding Interview, Role-Based Interview
 *
 * Expected feedbackData shape:
 *   overall_score, detailed_scores.{Technical Skills, Problem Solving}.{score, breakdown}
 *   feedback_summary.{strengths, areas_of_improvements}
 *   sub_scores.{Technical Skills, Problem Solving}.{percentile, total_participants}
 *   interaction_log, interaction_status_log
 *   soft_skill_summary, speech_summary, big5_features
 */
const TechnicalFeedbackTemplate = ({ feedbackData = {}, interviewType = 'Technical Interview', canAccessFullFeedback = true, currentTier = 0, onUnlock }) => {
  const overallScore = Math.trunc(feedbackData?.overall_score || 0);
  const detailedScores = feedbackData?.detailed_scores || {};
  const feedbackSummary = feedbackData?.feedback_summary || {};
  const subScores = feedbackData?.sub_scores || {};

  // Build transcript from interaction_log + interaction_status_log
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

  // Build categories for radar chart
  // Try both "Technical" and "Technical Skills" for backward compatibility
  const technicalDetails = detailedScores['Technical'] || detailedScores['Technical Skills'] || {};
  const problemDetails = detailedScores['Problem Solving'] || detailedScores['Problem Solving Skills'] || {};

  const technicalCategories = [
    { name: 'Programming Language', score: technicalDetails?.breakdown?.['Programming Language'] || 0, feedback: 'Mastery of syntax and idioms' },
    { name: 'Framework', score: technicalDetails?.breakdown?.['Framework'] || 0, feedback: 'Knowledge of relevant frameworks' },
    { name: 'Algorithms', score: technicalDetails?.breakdown?.['Algorithms'] || 0, feedback: 'Algorithm knowledge and complexity' },
    { name: 'Data Structures', score: technicalDetails?.breakdown?.['Data Structures'] || 0, feedback: 'Data structure usage and selection' },
  ];

  const problemCategories = [
    { name: 'Approach', score: problemDetails?.breakdown?.['Approach'] || 0, feedback: 'Problem-solving methodology' },
    { name: 'Optimization', score: problemDetails?.breakdown?.['Optimization'] || 0, feedback: 'Ability to optimize solutions' },
    { name: 'Debugging', score: problemDetails?.breakdown?.['Debugging'] || 0, feedback: 'Finding and fixing bugs' },
    { name: 'Syntax', score: problemDetails?.breakdown?.['Syntax'] || 0, feedback: 'Code syntax correctness' },
  ];

  const allCategories = [...technicalCategories, ...problemCategories];

  // Percentile calculations
  const techPercentile = Math.round(subScores['Technical']?.percentile || subScores['Technical Skills']?.percentile || 0);
  const psPercentile = Math.round(subScores['Problem Solving']?.percentile || subScores['Problem Solving Skills']?.percentile || 0);
  const avgPercentile = allCategories.length > 0
    ? Math.round(allCategories.reduce((s, c) => s + (c.score || 0), 0) / allCategories.length)
    : 0;

  const strengths = feedbackSummary?.strengths || [];
  const improvements = feedbackSummary?.areas_of_improvements || feedbackSummary?.areas_of_improvement || [];

  const confidenceScore = Math.round(feedbackData?.soft_skill_summary?.confidence || overallScore);
  const hiringReadiness = Math.min(overallScore + 10, 95);
  const companyReadiness = Math.min(overallScore + 5, 90);

  return (
    <div className="space-y-8 px-2 sm:px-4 pb-12">

      {/* ROW 1: Metric Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <MetricCard label="Overall Score" value={`${overallScore}%`} icon={Target} bgColor="bg-gradient-to-br from-orange-600 via-orange-700 to-pink-600" />
        <MetricCard label="Tech Skills" value={`${Math.trunc(technicalDetails?.score || 0)}%`} icon={Code} bgColor="bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600" />
        <MetricCard label="Problem Solving" value={`${Math.trunc(problemDetails?.score || 0)}%`} icon={Brain} bgColor="bg-gradient-to-br from-green-600 via-green-700 to-emerald-600" />
      </motion.div>

      {/* ROW 2: AI Performance Summary (Radial Gauges) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-[2.5rem] blur-3xl -z-10 animate-pulse" />
        <div className="bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/30 rounded-[2.5rem] shadow-2xl border-2 border-indigo-200/60 p-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="text-white" size={28} />
            </div>
            <div>
              <h3 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                AI Performance Summary
              </h3>
              <p className="text-gray-600 text-base mt-1 font-medium">Technical readiness assessment</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {[
              { score: confidenceScore, label: 'Interview Confidence', sub: 'AI Assessment', color: '#8b5cf6' },
              { score: hiringReadiness, label: 'Hiring Readiness', sub: 'Company Fit Score', color: '#10b981' },
              { score: companyReadiness, label: 'Technical Readiness', sub: 'Estimated Match', color: '#f59e0b' },
            ].map((g, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="bg-white/90 rounded-3xl p-8 border-2 border-gray-100 shadow-xl flex flex-col items-center">
                <RadialGauge score={g.score} label={g.label} subLabel={g.sub} color={g.color} size={160} />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ROW 3: Response Analysis — locked for free users */}
      <LockedSection isLocked={!canAccessFullFeedback} title="Response Analysis" currentTier={currentTier} onUnlock={onUnlock}>
        <ResponseAnalysis transcript={transcript} />
      </LockedSection>

      {/* ROW 4: Technical Skills Radar + Score Bars — locked */}
      <LockedSection isLocked={!canAccessFullFeedback} title="Technical Skills Breakdown" currentTier={currentTier} onUnlock={onUnlock}>
        <ScoreBreakdown
          title="Technical Skills Breakdown"
          subtitle="Your performance across core technical areas"
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
          radarGrid="#fbbf24"
          radarTick="#92400e"
          categories={technicalCategories}
        />
      </LockedSection>

      {/* ROW 5: Problem Solving Radar + Score Bars — locked */}
      <LockedSection isLocked={!canAccessFullFeedback} title="Problem Solving Breakdown" currentTier={currentTier} onUnlock={onUnlock}>
        <ScoreBreakdown
          title="Problem Solving Breakdown"
          subtitle="Your approach, optimization, and debugging skills"
          gradientFrom="from-violet-600"
          gradientTo="to-purple-600"
          borderColor="border-violet-200/60"
          bgFrom="from-white"
          bgVia="via-violet-50/40"
          bgTo="to-purple-50/30"
          glowFrom="from-violet-500/10"
          glowVia="via-purple-500/10"
          glowTo="to-pink-500/10"
          radarStroke="#7c3aed"
          radarFill="#7c3aed"
          radarGrid="#a78bfa"
          radarTick="#4c1d95"
          categories={problemCategories}
        />
      </LockedSection>

      {/* ROW 6: Detailed Bar Charts — locked */}
      <LockedSection isLocked={!canAccessFullFeedback} title="Detailed Performance Analysis" currentTier={currentTier} onUnlock={onUnlock}>
        <DetailedScoreBars
          title="Detailed Performance Analysis"
          subtitle="Comprehensive breakdown with benchmarks"
          gradientFrom="from-indigo-600"
          gradientTo="to-pink-600"
          borderColor="border-indigo-200/60"
          bgFrom="from-white"
          bgVia="via-indigo-50/40"
          bgTo="to-purple-50/30"
          glowFrom="from-indigo-500/10"
          glowVia="via-purple-500/10"
          glowTo="to-pink-500/10"
          leftTitle="Technical Skills"
          rightTitle="Problem Solving"
          leftScore={technicalDetails?.score || 0}
          rightScore={problemDetails?.score || 0}
          leftBreakdown={technicalDetails?.breakdown || {}}
          rightBreakdown={problemDetails?.breakdown || {}}
          leftColor="#3b82f6"
          rightColor="#8b5cf6"
        />
      </LockedSection>

      {/* ROW 7: Strengths & Improvements — locked */}
      <LockedSection isLocked={!canAccessFullFeedback} title="Strengths & Improvements" currentTier={currentTier} onUnlock={onUnlock}>
        <StrengthsAndImprovements
          strengths={strengths}
          improvements={improvements}
          recommendations={[
            'Study advanced algorithms and data structures',
            'Practice daily coding challenges on LeetCode/HackerRank',
            'Learn system design patterns and architecture',
            'Review code optimization and time/space complexity',
          ]}
        />
      </LockedSection>

      {/* ROW 8: Transcript — locked */}
      <LockedSection isLocked={!canAccessFullFeedback} title="Interview Transcript" currentTier={currentTier} onUnlock={onUnlock}>
        <TranscriptViewer transcript={transcript} />
      </LockedSection>
    </div>
  );
};

export default TechnicalFeedbackTemplate;
