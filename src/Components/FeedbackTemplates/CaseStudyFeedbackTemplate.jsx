import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Lightbulb, BarChart3, Brain } from 'lucide-react';
import { MetricCard } from './shared/MetricCards';
import ScoreBreakdown from './shared/ScoreBreakdown';
import DetailedScoreBars from './shared/DetailedScoreBars';
import ResponseAnalysis from './shared/ResponseAnalysis';
import TranscriptViewer from './shared/TranscriptViewer';
import StrengthsAndImprovements from './shared/StrengthsAndImprovements';
import RadialGauge from '../ResumeAnalysis/RadialGauge';
import LockedSection from './shared/LockedSection';

/**
 * CaseStudyFeedbackTemplate
 * For: Case Study Interview
 *
 * Expected feedbackData shape:
 *   overall_score
 *   detailed_scores.{Analytical Skills, Business Impact}.{score, breakdown}
 *   feedback_summary.{strengths, areas_of_improvements}
 *   sub_scores.{Analytical Skills, Business Impact}.{percentile}
 *   interaction_log, interaction_status_log
 */
const CaseStudyFeedbackTemplate = ({ feedbackData = {}, canAccessFullFeedback = true, currentTier = 0, onUnlock }) => {
  const overallScore = Math.trunc(feedbackData?.overall_score || 0);
  const detailedScores = feedbackData?.detailed_scores || {};
  const feedbackSummary = feedbackData?.feedback_summary || {};
  const subScores = feedbackData?.sub_scores || {};

  // Try both "Analytical" and "Analytical Skills" for backward compatibility
  const analyticalDetails = detailedScores['Analytical'] || detailedScores['Analytical Skills'] || {};
  const businessDetails = detailedScores['Business Impact'] || detailedScores['Business Impact Skills'] || {};

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

  const analyticalCategories = [
    { name: 'Problem Identification', score: analyticalDetails?.breakdown?.['Problem Understanding'] ?? analyticalDetails?.breakdown?.['Problem Identification'] ?? 0, feedback: 'Identifying core issues' },
    { name: 'Data Interpretation', score: analyticalDetails?.breakdown?.['Hypothesis'] ?? analyticalDetails?.breakdown?.['Data Interpretation'] ?? 0, feedback: 'Reading and interpreting data' },
    { name: 'Logical Reasoning', score: analyticalDetails?.breakdown?.['Analysis'] ?? analyticalDetails?.breakdown?.['Logical Reasoning'] ?? 0, feedback: 'Sound logical analysis' },
    { name: 'Solution Framework', score: analyticalDetails?.breakdown?.['Synthesis'] ?? analyticalDetails?.breakdown?.['Solution Framework'] ?? 0, feedback: 'Structured problem-solving approach' },
  ];

  const businessCategories = [
    { name: 'Strategic Thinking', score: businessDetails?.breakdown?.['Business Judgment'] ?? businessDetails?.breakdown?.['Strategic Thinking'] ?? 0, feedback: 'Long-term business perspective' },
    { name: 'ROI Analysis', score: businessDetails?.breakdown?.['Creativity'] ?? businessDetails?.breakdown?.['ROI Analysis'] ?? 0, feedback: 'Return on investment assessment' },
    { name: 'Risk Assessment', score: businessDetails?.breakdown?.['Decision Making'] ?? businessDetails?.breakdown?.['Risk Assessment'] ?? 0, feedback: 'Identifying business risks' },
    { name: 'Recommendations', score: businessDetails?.breakdown?.['Impact Orientation'] ?? businessDetails?.breakdown?.['Recommendations'] ?? 0, feedback: 'Quality of proposed solutions' },
  ];

  const analyticalPercentile = Math.round(subScores['Analytical']?.percentile || subScores['Analytical Skills']?.percentile || 0);
  const businessPercentile = Math.round(subScores['Business Impact']?.percentile || subScores['Business Impact Skills']?.percentile || 0);

  const strengths = feedbackSummary?.strengths || [];
  const improvements = feedbackSummary?.areas_of_improvements || feedbackSummary?.areas_of_improvement || [];

  const confidenceScore = Math.round(feedbackData?.soft_skill_summary?.confidence || overallScore);
  const hiringReadiness = Math.min(overallScore + 10, 95);
  const strategicScore = Math.min(overallScore + 5, 90);

  return (
    <div className="space-y-8 px-2 sm:px-4 pb-12">

      {/* ROW 1: Metric Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <MetricCard label="Overall Score" value={`${overallScore}%`} icon={Target} bgColor="bg-gradient-to-br from-amber-600 via-yellow-600 to-orange-500" />
        <MetricCard label="Analytical Skills" value={`${Math.trunc(analyticalDetails?.score || 0)}%`} icon={Lightbulb} bgColor="bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-600" />
        <MetricCard label="Business Impact" value={`${Math.trunc(businessDetails?.score || 0)}%`} icon={BarChart3} bgColor="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600" />
      </motion.div>

      {/* ROW 2: AI Performance Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-yellow-500/20 to-orange-500/20 rounded-[2.5rem] blur-3xl -z-10 animate-pulse" />
        <div className="bg-gradient-to-br from-white via-amber-50/40 to-yellow-50/30 rounded-[2.5rem] shadow-2xl border-2 border-amber-200/60 p-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="text-white" size={28} />
            </div>
            <div>
              <h3 className="text-3xl font-extrabold bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent">
                Case Study Readiness
              </h3>
              <p className="text-gray-600 text-base mt-1 font-medium">Analytical thinking and business acumen assessment</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {[
              { score: confidenceScore, label: 'Analytical Confidence', sub: 'AI Assessment', color: '#f59e0b' },
              { score: hiringReadiness, label: 'Consultant Readiness', sub: 'Industry Match', color: '#10b981' },
              { score: strategicScore, label: 'Strategic Thinking', sub: 'Business Score', color: '#8b5cf6' },
            ].map((g, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="bg-white/90 rounded-3xl p-8 border-2 border-gray-100 shadow-xl flex flex-col items-center">
                <RadialGauge score={g.score} label={g.label} subLabel={g.sub} color={g.color} size={160} />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <LockedSection isLocked={!canAccessFullFeedback} title="Response Analysis" currentTier={currentTier} onUnlock={onUnlock}>
        <ResponseAnalysis transcript={transcript} />
      </LockedSection>

      <LockedSection isLocked={!canAccessFullFeedback} title="Analytical Skills Breakdown" currentTier={currentTier} onUnlock={onUnlock}>
        <ScoreBreakdown
          title="Analytical Skills"
          subtitle="Problem identification, data interpretation, and logical reasoning"
          gradientFrom="from-amber-600"
          gradientTo="to-yellow-600"
          borderColor="border-amber-200/60"
          bgFrom="from-white"
          bgVia="via-amber-50/40"
          bgTo="to-yellow-50/30"
          glowFrom="from-amber-500/10"
          glowVia="via-yellow-500/10"
          glowTo="to-orange-500/10"
          radarStroke="#f59e0b"
          radarFill="#f59e0b"
          radarGrid="#fde68a"
          radarTick="#78350f"
          categories={analyticalCategories}
        />
      </LockedSection>

      <LockedSection isLocked={!canAccessFullFeedback} title="Business Impact Breakdown" currentTier={currentTier} onUnlock={onUnlock}>
        <ScoreBreakdown
          title="Business Impact"
          subtitle="Strategic thinking, ROI, risk assessment, and recommendations"
          gradientFrom="from-emerald-600"
          gradientTo="to-teal-600"
          borderColor="border-emerald-200/60"
          bgFrom="from-white"
          bgVia="via-emerald-50/40"
          bgTo="to-teal-50/30"
          glowFrom="from-emerald-500/10"
          glowVia="via-teal-500/10"
          glowTo="to-cyan-500/10"
          radarStroke="#10b981"
          radarFill="#10b981"
          radarGrid="#6ee7b7"
          radarTick="#064e3b"
          categories={businessCategories}
        />
      </LockedSection>

      <LockedSection isLocked={!canAccessFullFeedback} title="Detailed Case Study Analysis" currentTier={currentTier} onUnlock={onUnlock}>
        <DetailedScoreBars
          title="Detailed Case Study Analysis"
          subtitle="Comprehensive breakdown with benchmarks"
          gradientFrom="from-amber-600"
          gradientTo="to-emerald-600"
          borderColor="border-amber-200/60"
          bgFrom="from-white"
          bgVia="via-amber-50/40"
          bgTo="to-emerald-50/30"
          glowFrom="from-amber-500/10"
          glowVia="via-yellow-500/10"
          glowTo="to-emerald-500/10"
          leftTitle="Analytical Skills"
          rightTitle="Business Impact"
          leftScore={analyticalDetails?.score || 0}
          rightScore={businessDetails?.score || 0}
          leftBreakdown={analyticalDetails?.breakdown || {}}
          rightBreakdown={businessDetails?.breakdown || {}}
          leftColor="#f59e0b"
          rightColor="#10b981"
        />
      </LockedSection>

      <LockedSection isLocked={!canAccessFullFeedback} title="Strengths & Improvements" currentTier={currentTier} onUnlock={onUnlock}>
        <StrengthsAndImprovements
          strengths={strengths}
          improvements={improvements}
          recommendations={[
            'Practice case frameworks like McKinsey, BCG, and Porter\'s Five Forces',
            'Improve data analysis skills with Excel and basic statistics',
            'Focus on structured communication — MECE principles',
            'Study business cases from top consulting firms',
          ]}
        />
      </LockedSection>

      <LockedSection isLocked={!canAccessFullFeedback} title="Interview Transcript" currentTier={currentTier} onUnlock={onUnlock}>
        <TranscriptViewer transcript={transcript} />
      </LockedSection>
    </div>
  );
};

export default CaseStudyFeedbackTemplate;
