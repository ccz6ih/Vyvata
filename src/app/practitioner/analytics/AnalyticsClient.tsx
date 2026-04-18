"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";
import PractitionerNav from "@/components/PractitionerNav";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CohortAnalytics {
  totalPatients: number;
  activePatients: number;
  goalDistribution: Array<{ goal: string; count: number }>;
  protocolDistribution: Array<{ protocol: string; count: number }>;
  stackComplexity: Array<{ range: string; count: number }>;
  interactionStats: {
    withInteractions: number;
    withoutInteractions: number;
  };
  evidenceTiers: Array<{ tier: string; count: number }>;
  trendingIngredients: Array<{ ingredient: string; count: number }>;
}

const COLORS = {
  primary: "#14B8A6",
  secondary: "#0EA5E9",
  accent: "#8B5CF6",
  warning: "#F59E0B",
  danger: "#EF4444",
  success: "#10B981",
  gray: "#64748B",
};

const PIE_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.accent,
  COLORS.warning,
  COLORS.success,
  "#EC4899",
  "#F97316",
  "#06B6D4",
];

export default function AnalyticsClient({ practitioner }: { practitioner: any }) {
  const [analytics, setAnalytics] = useState<CohortAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/practitioner/analytics/cohort");
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <main className="min-h-dvh" style={{ background: "#0B1F3B" }}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-sm" style={{ color: "#7A90A8" }}>
            Loading analytics...
          </div>
        </div>
      </main>
    );
  }

  if (!analytics) {
    return (
      <main className="min-h-dvh" style={{ background: "#0B1F3B" }}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-sm" style={{ color: "#EF4444" }}>
            Failed to load analytics
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B" }}>
      {/* Header */}
      <header
        className="px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{
          background: "rgba(11,31,59,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,214,223,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/practitioner/dashboard" className="p-1.5 rounded-lg md:hidden" style={{ color: "#7A90A8" }}>
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <VyvataLogo size={20} />
            <span className="font-bold text-sm text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Vyvata
            </span>
          </div>
        </div>
        <PractitionerNav />
        <div className="flex items-center gap-2" style={{ color: "#7A90A8", fontSize: "13px" }}>
          <span>{practitioner.user.email}</span>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: "#FFFFFF", fontFamily: "Montserrat, sans-serif" }}
          >
            Cohort Analytics
          </h1>
          <p style={{ color: "#7A90A8", fontSize: "14px" }}>
            Insights across your {analytics.totalPatients} patient{analytics.totalPatients !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div
            className="rounded-xl p-6"
            style={{
              background: "rgba(17,32,64,0.6)",
              border: "1px solid rgba(201,214,223,0.10)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <img src="/icons/Set Your Goals.svg" alt="Goals" className="w-8 h-8" />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
                Total Patients
              </span>
            </div>
            <div className="text-4xl font-bold" style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}>
              {analytics.totalPatients}
            </div>
          </div>

          <div
            className="rounded-xl p-6"
            style={{
              background: "rgba(17,32,64,0.6)",
              border: "1px solid rgba(201,214,223,0.10)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <img src="/icons/Stay Fit.svg" alt="Active" className="w-8 h-8" />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
                Active Patients
              </span>
            </div>
            <div className="text-4xl font-bold" style={{ color: "#10B981", fontFamily: "Montserrat, sans-serif" }}>
              {analytics.activePatients}
            </div>
          </div>

          <div
            className="rounded-xl p-6"
            style={{
              background: "rgba(17,32,64,0.6)",
              border: "1px solid rgba(201,214,223,0.10)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <img src="/icons/Supplements.svg" alt="Ingredients" className="w-8 h-8" />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
                Unique Ingredients
              </span>
            </div>
            <div className="text-4xl font-bold" style={{ color: "#8B5CF6", fontFamily: "Montserrat, sans-serif" }}>
              {analytics.trendingIngredients.length}
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goal Distribution */}
          <div
            className="rounded-xl p-6"
            style={{
              background: "rgba(17,32,64,0.6)",
              border: "1px solid rgba(201,214,223,0.10)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <img src="/icons/Set Your Goals.svg" alt="Goals" className="w-6 h-6" />
              <h2 className="text-lg font-bold" style={{ color: "#FFFFFF", fontFamily: "Montserrat, sans-serif" }}>
                Goal Distribution
              </h2>
            </div>
            {analytics.goalDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.goalDistribution}
                    dataKey="count"
                    nameKey="goal"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                  >
                    {analytics.goalDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#112040",
                      border: "1px solid rgba(201,214,223,0.2)",
                      borderRadius: "8px",
                      color: "#FFFFFF",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]" style={{ color: "#7A90A8" }}>
                No goal data available
              </div>
            )}
          </div>

          {/* Protocol Distribution */}
          <div
            className="rounded-xl p-6"
            style={{
              background: "rgba(17,32,64,0.6)",
              border: "1px solid rgba(201,214,223,0.10)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <img src="/icons/Healthy Diet Plans.svg" alt="Protocols" className="w-6 h-6" />
              <h2 className="text-lg font-bold" style={{ color: "#FFFFFF", fontFamily: "Montserrat, sans-serif" }}>
                Protocol Distribution
              </h2>
            </div>
            {analytics.protocolDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.protocolDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,214,223,0.1)" />
                  <XAxis dataKey="protocol" stroke="#7A90A8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#7A90A8" />
                  <Tooltip
                    contentStyle={{
                      background: "#112040",
                      border: "1px solid rgba(201,214,223,0.2)",
                      borderRadius: "8px",
                      color: "#FFFFFF",
                    }}
                  />
                  <Bar dataKey="count" fill="#14B8A6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]" style={{ color: "#7A90A8" }}>
                No protocol data available
              </div>
            )}
          </div>

          {/* Stack Complexity */}
          <div
            className="rounded-xl p-6"
            style={{
              background: "rgba(17,32,64,0.6)",
              border: "1px solid rgba(201,214,223,0.10)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <img src="/icons/Supplements.svg" alt="Stack" className="w-6 h-6" />
              <h2 className="text-lg font-bold" style={{ color: "#FFFFFF", fontFamily: "Montserrat, sans-serif" }}>
                Stack Complexity
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.stackComplexity}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,214,223,0.1)" />
                <XAxis dataKey="range" stroke="#7A90A8" label={{ value: "Ingredients", position: "insideBottom", offset: -5 }} />
                <YAxis stroke="#7A90A8" label={{ value: "Patients", angle: -90, position: "insideLeft" }} />
                <Tooltip
                  contentStyle={{
                    background: "#112040",
                    border: "1px solid rgba(201,214,223,0.2)",
                    borderRadius: "8px",
                    color: "#FFFFFF",
                  }}
                />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interaction Stats */}
          <div
            className="rounded-xl p-6"
            style={{
              background: "rgba(17,32,64,0.6)",
              border: "1px solid rgba(201,214,223,0.10)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <img src="/icons/Detoxification.svg" alt="Interactions" className="w-6 h-6" />
              <h2 className="text-lg font-bold" style={{ color: "#FFFFFF", fontFamily: "Montserrat, sans-serif" }}>
                Interaction Frequency
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "With Interactions", value: analytics.interactionStats.withInteractions },
                    { name: "No Interactions", value: analytics.interactionStats.withoutInteractions },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                >
                  <Cell fill="#EF4444" />
                  <Cell fill="#10B981" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#112040",
                    border: "1px solid rgba(201,214,223,0.2)",
                    borderRadius: "8px",
                    color: "#FFFFFF",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Evidence Tiers */}
          <div
            className="rounded-xl p-6"
            style={{
              background: "rgba(17,32,64,0.6)",
              border: "1px solid rgba(201,214,223,0.10)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <img src="/icons/Measure Your Fitness Progress.svg" alt="Evidence" className="w-6 h-6" />
              <h2 className="text-lg font-bold" style={{ color: "#FFFFFF", fontFamily: "Montserrat, sans-serif" }}>
                Evidence Quality
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.evidenceTiers}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,214,223,0.1)" />
                <XAxis dataKey="tier" stroke="#7A90A8" />
                <YAxis stroke="#7A90A8" />
                <Tooltip
                  contentStyle={{
                    background: "#112040",
                    border: "1px solid rgba(201,214,223,0.2)",
                    borderRadius: "8px",
                    color: "#FFFFFF",
                  }}
                />
                <Bar dataKey="count">
                  {analytics.evidenceTiers.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.tier === "Strong" ? "#10B981" : entry.tier === "Moderate" ? "#F59E0B" : "#EF4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Trending Ingredients */}
          <div
            className="rounded-xl p-6"
            style={{
              background: "rgba(17,32,64,0.6)",
              border: "1px solid rgba(201,214,223,0.10)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <img src="/icons/Vitamins.svg" alt="Trending" className="w-6 h-6" />
              <h2 className="text-lg font-bold" style={{ color: "#FFFFFF", fontFamily: "Montserrat, sans-serif" }}>
                Top 10 Trending Ingredients
              </h2>
            </div>
            {analytics.trendingIngredients.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.trendingIngredients} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,214,223,0.1)" />
                  <XAxis type="number" stroke="#7A90A8" />
                  <YAxis dataKey="ingredient" type="category" stroke="#7A90A8" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#112040",
                      border: "1px solid rgba(201,214,223,0.2)",
                      borderRadius: "8px",
                      color: "#FFFFFF",
                    }}
                  />
                  <Bar dataKey="count" fill="#0EA5E9" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]" style={{ color: "#7A90A8" }}>
                No ingredient data available
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
