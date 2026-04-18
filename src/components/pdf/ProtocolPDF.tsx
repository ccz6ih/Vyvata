/**
 * Protocol PDF Document
 * Main PDF template for patient protocol reports
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { PDFHeader } from "./PDFHeader";
import { PDFFooter } from "./PDFFooter";
import { FONTS } from "./fonts";

interface ProtocolPDFProps {
  // Patient info
  patientName: string;
  practitionerName: string;
  
  // Stack data
  score: number;
  protocolSlug: string | null;
  rawInput: string;
  goals: string[];
  
  // Quiz data
  ageRange: string | null;
  activityLevel: string | null;
  sleepQuality: string | null;
  primaryGoals: string[];
  
  // Report data (from audit)
  report: {
    verdict: string;
    working: Array<{ name: string; reason: string; evidenceTier: string }>;
    wasting: Array<{ name: string; reason: string; evidenceTier: string; recommendation: string }>;
    fighting: Array<{ ingredients: string[]; interaction: string; fix: string }>;
    missing: Array<{ name: string; reason: string; evidenceTier: string }>;
    revisedStack: Array<{ status: string; name: string; dose?: string; timing?: string; note?: string }>;
  } | null;
  
  // Additional metadata
  generatedDate: string;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 80,
    paddingHorizontal: 40,
    backgroundColor: "#FFFFFF",
    fontFamily: FONTS.body,
    fontSize: 10,
    color: "#1E293B",
  },
  
  // Title section
  title: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: 700,
    color: "#14B8A6",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: "#64748B",
    marginBottom: 20,
  },
  
  // Score card
  scoreCard: {
    backgroundColor: "#F0FDFA",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#14B8A6",
    borderLeftStyle: "solid",
  },
  scoreLabel: {
    fontFamily: FONTS.body,
    fontSize: 9,
    color: "#64748B",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontFamily: FONTS.heading,
    fontSize: 36,
    fontWeight: 900,
    color: "#14B8A6",
  },
  scoreContext: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: "#475569",
    marginTop: 8,
  },
  
  // Section styles
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: 700,
    color: "#1E293B",
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    borderBottomStyle: "solid",
  },
  
  // Health profile grid
  profileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  profileItem: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 6,
  },
  profileLabel: {
    fontFamily: FONTS.body,
    fontSize: 8,
    color: "#64748B",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  profileValue: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: "#1E293B",
    fontWeight: 600,
  },
  
  // Goals list
  goalsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  goalBadge: {
    backgroundColor: "#ECFDF5",
    color: "#14B8A6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    fontSize: 9,
    fontFamily: FONTS.body,
    fontWeight: 600,
  },
  
  // Stack ingredients
  ingredientsList: {
    gap: 8,
  },
  ingredient: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#14B8A6",
    marginTop: 4,
  },
  ingredientText: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: "#334155",
    flex: 1,
  },
  
  // Analysis items (working, fighting, etc.)
  analysisItem: {
    marginBottom: 12,
    paddingLeft: 12,
  },
  analysisName: {
    fontFamily: FONTS.body,
    fontSize: 10,
    fontWeight: 700,
    color: "#1E293B",
    marginBottom: 3,
  },
  analysisReason: {
    fontFamily: FONTS.body,
    fontSize: 9,
    color: "#475569",
    marginBottom: 3,
    lineHeight: 1.4,
  },
  evidenceBadge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: FONTS.body,
  },
  evidenceStrong: {
    backgroundColor: "#D1FAE5",
    color: "#065F46",
  },
  evidenceModerate: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
  },
  evidenceWeak: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  },
  
  // Verdict box
  verdictBox: {
    backgroundColor: "#F0F9FF",
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#0EA5E9",
    borderLeftStyle: "solid",
    marginBottom: 20,
  },
  verdictText: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: "#0F172A",
    lineHeight: 1.6,
  },
  
  // Warning/interaction styles
  warningBox: {
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
    borderLeftStyle: "solid",
    marginBottom: 10,
  },
  warningTitle: {
    fontFamily: FONTS.body,
    fontSize: 10,
    fontWeight: 700,
    color: "#991B1B",
    marginBottom: 4,
  },
  warningText: {
    fontFamily: FONTS.body,
    fontSize: 9,
    color: "#7F1D1D",
    lineHeight: 1.4,
  },
  warningFix: {
    fontFamily: FONTS.body,
    fontSize: 9,
    color: "#0F172A",
    marginTop: 4,
    fontWeight: 600,
  },
});

export function ProtocolPDF({
  patientName,
  practitionerName,
  score,
  protocolSlug,
  rawInput,
  goals,
  ageRange,
  activityLevel,
  sleepQuality,
  primaryGoals,
  report,
  generatedDate,
}: ProtocolPDFProps) {
  const protocolLabel = protocolSlug
    ? protocolSlug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "Custom Protocol";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          patientName={patientName}
          practitionerName={practitionerName}
          generatedDate={generatedDate}
        />

        {/* Title */}
        <Text style={styles.title}>Protocol Report</Text>
        <Text style={styles.subtitle}>{protocolLabel}</Text>

        {/* Stack Score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Stack Score</Text>
          <Text style={styles.scoreValue}>{score}/100</Text>
          <Text style={styles.scoreContext}>
            {score >= 70
              ? "Strong protocol with evidence-backed ingredients"
              : score >= 50
              ? "Moderate protocol with room for optimization"
              : "Significant optimization opportunities available"}
          </Text>
        </View>

        {/* Health Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Health Profile</Text>
          <View style={styles.profileGrid}>
            {ageRange && (
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Age Range</Text>
                <Text style={styles.profileValue}>{ageRange}</Text>
              </View>
            )}
            {activityLevel && (
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Activity Level</Text>
                <Text style={styles.profileValue}>{activityLevel}</Text>
              </View>
            )}
            {sleepQuality && (
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Sleep Quality</Text>
                <Text style={styles.profileValue}>{sleepQuality}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Primary Goals */}
        {primaryGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Primary Goals</Text>
            <View style={styles.goalsList}>
              {primaryGoals.map((goal, i) => (
                <Text key={i} style={styles.goalBadge}>
                  {goal}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Current Stack */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Current Stack</Text>
          <View style={styles.ingredientsList}>
            {rawInput.split(/[\n,]/).filter(Boolean).map((line, i) => (
              <View key={i} style={styles.ingredient}>
                <View style={styles.ingredientBullet} />
                <Text style={styles.ingredientText}>{line.trim()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Report Verdict */}
        {report && report.verdict && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Analysis Summary</Text>
            <View style={styles.verdictBox}>
              <Text style={styles.verdictText}>{report.verdict}</Text>
            </View>
          </View>
        )}

        {/* Page break before detailed analysis */}
        <View break />
        <PDFHeader
          patientName={patientName}
          practitionerName={practitionerName}
          generatedDate={generatedDate}
        />

        {/* What's Working */}
        {report && report.working.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>✓ What's Working</Text>
            {report.working.map((item, i) => (
              <View key={i} style={styles.analysisItem}>
                <Text style={styles.analysisName}>{item.name}</Text>
                <Text style={styles.analysisReason}>{item.reason}</Text>
                <Text
                  style={[
                    styles.evidenceBadge,
                    item.evidenceTier === "strong"
                      ? styles.evidenceStrong
                      : item.evidenceTier === "moderate"
                      ? styles.evidenceModerate
                      : styles.evidenceWeak,
                  ]}
                >
                  {item.evidenceTier.toUpperCase()} EVIDENCE
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* What's Fighting */}
        {report && report.fighting.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>⚠ Potential Interactions</Text>
            {report.fighting.map((item, i) => (
              <View key={i} style={styles.warningBox}>
                <Text style={styles.warningTitle}>
                  {item.ingredients.join(" + ")}
                </Text>
                <Text style={styles.warningText}>{item.interaction}</Text>
                <Text style={styles.warningFix}>→ {item.fix}</Text>
              </View>
            ))}
          </View>
        )}

        {/* What's Missing */}
        {report && report.missing.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>→ Recommended Additions</Text>
            {report.missing.slice(0, 5).map((item, i) => (
              <View key={i} style={styles.analysisItem}>
                <Text style={styles.analysisName}>{item.name}</Text>
                <Text style={styles.analysisReason}>{item.reason}</Text>
              </View>
            ))}
          </View>
        )}

        <PDFFooter />
      </Page>
    </Document>
  );
}
