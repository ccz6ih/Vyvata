/**
 * PDF Header Component
 * Displays Vyvata branding and patient/practitioner info
 */

import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { FONTS } from "./fonts";

interface PDFHeaderProps {
  patientName: string;
  practitionerName: string;
  generatedDate: string;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#14B8A6",
    borderBottomStyle: "solid",
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    width: 24,
    height: 24,
    backgroundColor: "#14B8A6",
    borderRadius: 6,
  },
  logoText: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: 900,
    color: "#14B8A6",
    letterSpacing: 0.5,
  },
  info: {
    textAlign: "right",
  },
  patientName: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: 700,
    color: "#1E293B",
    marginBottom: 4,
  },
  practitioner: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: "#64748B",
    marginBottom: 2,
  },
  date: {
    fontFamily: FONTS.body,
    fontSize: 9,
    color: "#94A3B8",
  },
});

export function PDFHeader({
  patientName,
  practitionerName,
  generatedDate,
}: PDFHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.logo}>
        {/* Simple colored box as logo placeholder - could be replaced with Image */}
        <View style={styles.logoIcon} />
        <Text style={styles.logoText}>VYVATA</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.patientName}>{patientName}</Text>
        <Text style={styles.practitioner}>{practitionerName}</Text>
        <Text style={styles.date}>{generatedDate}</Text>
      </View>
    </View>
  );
}
