import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Users, Heart, Brain } from 'lucide-react';
import { MetricCard } from './shared/MetricCards';
import ScoreBreakdown from './shared/ScoreBreakdown';
import DetailedScoreBars from './shared/DetailedScoreBars';
import ResponseAnalysis from './shared/ResponseAnalysis';
import TranscriptViewer from './shared/TranscriptViewer';
import StrengthsAndImprovements from './shared/StrengthsAndImprovements';
import RadialGauge from '../ResumeAnalysis/RadialGauge';
import LockedSection from './shared/LockedSection';

/**
 * HRFeedbackTemplate
 * For: HR Interview
 *
 * Expected feedbackData shape:
 *   overall_score
 *   detailed_scores.{Communication Skills, Cultural Fit}.{score, breakdown}
 *   feedback_summary.{strengths, areas_of_improvements}
 *   sub_scores.{Communication Skills, Cultural Fit}.{percentile, total_participants}
 *   interaction_log, interaction_status_log
 *   soft_skill_summary, speech_summary, big5_features
 */
const HRFeedbackTemplate = ({ feedbackData = {}, canAccessFullFeedback = true, currentTier = 0, onUnlock }) => {
  const overallScore = Math.trunc(feedbackData?.overall_score || 0);
  const detailedScores = feedbackData?.detailed_scores || {};
  const feedbackSummary = feedbackData?.feedback_summary || {};
  const subScores = feedbackData?.sub_scores || {};

  const commDetails = detailedScores['Communication Skills'] || {};
  const culturalDetails = detailedScores['Cultural Fit'] || {};

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

  const commCategories = [
    { name: 'Clarity', score: commDetails?.breakdown?.['Clarity'] || 0, feedback: 'Clearness of expression and ideas' },
    { name: 'Confidence', score: commDetails?.breakdown?.['Confidence'] || 0, feedback: 'Confidence and self-assurance' },
    { name: 'Structure', score: commDetails?.breakdown?.['Structure'] || 0, feedback: 'Organization and flow of responses' },
    { name: 'Engagement', score: commDetails?.breakdown?.['Engagement'] || 0, feedback: 'Enthusiasm and active engagement' },
  ];

  const culturalCategories = [
    { name: 'Values', score: culturalDetails?.breakdown?.['Values'] || 0, feedback: 'Alignment with company values' },
    { name: 'Teamwork', score: culturalDetails?.breakdown?.['Teamwork'] || 0, feedback: 'Collaboration and team orientation' },
    { name: 'Growth', score: culturalDetails?.breakdown?.['Growth'] || 0, feedback: 'Growth mindset and learning attitude' },
    { name: 'Initiative', score: culturalDetails?.breakdown?.['Initiative'] || 0, feedback: 'Proactiveness and initiative' },
  ];

  const commPercentile = Math.round(subScores['Communication Skills']?.percentile || 0);
  const culturalPercentile = Math.round(subScores['Cultural Fit']?.percentile || 0);

  const strengths = feedbackSummary?.strengths || [];
  const improvements = feedbackSummary?.areas_of_improvements || feedbackSummary?.areas_of_improvement || [];

  const confidenceScore = Math.round(feedbackData?.soft_skill_summary?.confidence || overallScore);
  const hiringReadiness = Math.min(overallScore + 10, 95);
  const culturalFitScore = Math.min(overallScore + 5, 90);

  return (
    <div className="space-y-8 px-2 sm:px-4 pb-12">

      {/* ROW 1: Metric Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <MetricCard label="Overall Score" value={`${overallScore}%`} icon={Target} bgColor="bg-gradient-to-br from-green-600 via-green-700 to-teal-600" />
        <MetricCard label="Communication" value={`${Math.trunc(commDetails?.score || 0)}%`} icon={Users} bgColor="bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600" />
        <MetricCard label="Cultural Fit" value={`${Math.trunc(culturalDetails?.score || 0)}%`} icon={Heart} bgColor="bg-gradient-to-br from-pink-600 via-rose-600 to-red-600" />
      </motion.div>

      {/* ROW 2: AI Performance Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-teal-500/20 to-cyan-500/20 rounded-[2.5rem] blur-3xl -z-10 animate-pulse" />
        <div className="bg-gradient-to-br from-white via-green-50/40 to-teal-50/30 rounded-[2.5rem] shadow-2xl border-2 border-green-200/60 p-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="text-white" size={28} />
            </div>
            <div>
              <h3 className="text-3xl font-extrabold bg-gradient-to-r from-green-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                HR Readiness Assessment
              </h3>
              <p className="text-gray-600 text-base mt-1 font-medium">Your behavioral and cultural fit scores</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {[
              { score: confidenceScore, label: 'Interview Confidence', sub: 'AI Assessment', color: '#10b981' },
              { score: hiringReadiness, label: 'Hiring Readiness', sub: 'Company Fit Score', color: '#3b82f6' },
              { score: culturalFitScore, label: 'Cultural Alignment', sub: 'Values Match', color: '#ec4899' },
            ].map((g, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="bg-white/90 rounded-3xl p-8 border-2 border-gray-100 shadow-xl flex flex-col items-center">
                <RadialGauge score={g.score} label={g.label} subLabel={g.sub} color={g.color} size={160} />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ROW 3–8: Locked for free users */}
      <LockedSection isLocked={!canAccessFullFeedback} title="Response Analysis" currentTier={currentTier} onUnlock={onUnlock}>
        <ResponseAnalysis transcript={transcript} />
      </LockedSection>

      <LockedSection isLocked={!canAccessFullFeedback} title="Communication Skills Breakdown" currentTier={currentTier} onUnlock={onUnlock}>
        <ScoreBreakdown
          title="Communication Skills"
          subtitle="Clarity, confidence, structure, and engagement"
          gradientFrom="from-blue-600"
          gradientTo="to-cyan-600"
          borderColor="border-blue-200/60"
          bgFrom="from-white"
          bgVia="via-blue-50/40"
          bgTo="to-cyan-50/30"
          glowFrom="from-blue-500/10"
          glowVia="via-cyan-500/10"
          glowTo="to-teal-500/10"
          radarStroke="#3b82f6"
          radarFill="#3b82f6"
          radarGrid="#93c5fd"
          radarTick="#1e3a8a"
          categories={commCategories}
        />
      </LockedSection>

      <LockedSection isLocked={!canAccessFullFeedback} title="Cultural Fit Breakdown" currentTier={currentTier} onUnlock={onUnlock}>
        <ScoreBreakdown
          title="Cultural Fit"
          subtitle="Values alignment, teamwork, growth, and initiative"
          gradientFrom="from-pink-600"
          gradientTo="to-rose-600"
          borderColor="border-pink-200/60"
          bgFrom="from-white"
          bgVia="via-pink-50/40"
          bgTo="to-rose-50/30"
          glowFrom="from-pink-500/10"
          glowVia="via-rose-500/10"
          glowTo="to-red-500/10"
          radarStroke="#ec4899"
          radarFill="#ec4899"
          radarGrid="#f9a8d4"
          radarTick="#831843"
          categories={culturalCategories}
        />
      </LockedSection>

      <LockedSection isLocked={!canAccessFullFeedback} title="Detailed HR Analysis" currentTier={currentTier} onUnlock={onUnlock}>
        <DetailedScoreBars
          title="Detailed HR Performance Analysis"
          subtitle="Comprehensive breakdown with benchmarks"
          gradientFrom="from-green-600"
          gradientTo="to-teal-600"
          borderColor="border-green-200/60"
          bgFrom="from-white"
          bgVia="via-green-50/40"
          bgTo="to-teal-50/30"
          glowFrom="from-green-500/10"
          glowVia="via-teal-500/10"
          glowTo="to-cyan-500/10"
          leftTitle="Communication Skills"
          rightTitle="Cultural Fit"
          leftScore={commDetails?.score || 0}
          rightScore={culturalDetails?.score || 0}
          leftBreakdown={commDetails?.breakdown || {}}
          rightBreakdown={culturalDetails?.breakdown || {}}
          leftColor="#3b82f6"
          rightColor="#ec4899"
        />
      </LockedSection>

      <LockedSection isLocked={!canAccessFullFeedback} title="Strengths & Improvements" currentTier={currentTier} onUnlock={onUnlock}>
        <StrengthsAndImprovements
          strengths={strengths}
          improvements={improvements}
          recommendations={[
            'Research the company values and culture more deeply',
            'Prepare more STAR method examples for behavioral questions',
            'Practice articulating your achievements with measurable outcomes',
            'Work on demonstrating leadership and ownership in responses',
          ]}
        />
      </LockedSection>

      <LockedSection isLocked={!canAccessFullFeedback} title="Interview Transcript" currentTier={currentTier} onUnlock={onUnlock}>
        <TranscriptViewer transcript={transcript} />
      </LockedSection>
    </div>
  );
};

export default HRFeedbackTemplate;
