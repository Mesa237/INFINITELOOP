// src/screens/public-services.jsx
// Public services section for CouCouMTL: same data as the showcase website.
// Tapping a square opens the official page; tapping the number starts a call.
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const C = {
  ink: '#20211C',
  yellow: '#FFDF46',
  lilac: '#D8C2F4',
  cream: '#FFFDF4',
  white: '#FFFFFF',
  muted: '#55574E',
  line: '#DEDED1',
};

// Numbers and hours from official websites (Nov 2026). They can change.
export const SERVICES = [
  { code: '911', name: 'Emergency', desc: 'Police, fire, ambulance', phone: '911', dial: '911', hrs: '24/7', url: 'tel:911', urgent: true },
  { code: '811', name: 'Info-Santé / Info-Social', desc: 'Option 1: nurse · option 2: social worker', phone: '811', dial: '811', hrs: '24/7 · free & confidential', url: 'https://www.quebec.ca/en/health/finding-a-resource/info-sante-811' },
  { code: '311', name: 'Ville de Montréal', desc: 'City services, snow removal, collection, permits', phone: '311 · 514 872-0311', dial: '5148720311', hrs: 'Mon–Fri 8:30–20:30 · weekends 9–17', url: 'https://montreal.ca/en/contact-us' },
  { code: '211', name: '211 Grand Montréal', desc: 'Community and social resources near you', phone: '211', dial: '211', hrs: 'Free & confidential', url: 'https://www.211qc.ca/en' },
  { code: 'IRCC', name: 'Immigration Canada (IRCC)', desc: 'Permits, PR, citizenship, application status', phone: '1 888 242-2100', dial: '18882422100', hrs: 'Agents Mon–Fri 8–16 · automated 24/7', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/corporate/contact-ircc.html' },
  { code: 'MIFI', name: 'Immigration Québec (MIFI)', desc: 'Québec immigration, francization, integration', phone: '514 864-9191', dial: '5148649191', hrs: 'Toll-free 1 877 864-9191', url: 'https://www.quebec.ca/en/gouvernement/ministere/immigration' },
  { code: 'RAMQ', name: 'Health insurance (RAMQ)', desc: 'Health card, coverage, drug insurance', phone: '514 864-3411', dial: '5148643411', hrs: 'Elsewhere in Québec 1 800 561-9749', url: 'https://www.ramq.gouv.qc.ca/en/contact-us' },
  { code: 'HQ', name: 'Hydro-Québec', desc: 'Electricity account, moving, billing', phone: '1 888 385-7252', dial: '18883857252', hrs: 'Residential customers', url: 'https://www.hydroquebec.com/contact-us/' },
  { code: 'STM', name: 'STM · Montréal transit', desc: 'Trip planning, OPUS card, lost & found', phone: '514 786-4636', dial: '5147864636', hrs: '514 STM-INFO', url: 'https://www.stm.info/en/node/281' },
];

function Square({ s }) {
  const dark = s.urgent;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${s.name}, open official page`}
      onPress={() => Linking.openURL(s.url)}
      style={({ pressed }) => [st.square, dark && st.dark, pressed && { opacity: 0.6 }]}
    >
      <View style={st.top}>
        <Text style={[st.code, dark && { backgroundColor: C.yellow }]}>{s.code}</Text>
        <Text style={[st.arrow, dark && { color: C.cream }]}>↗</Text>
      </View>
      <View style={{ gap: 2 }}>
        <Text style={[st.name, dark && { color: C.cream }]}>{s.name}</Text>
        <Text style={[st.desc, dark && { color: '#BDBEAF' }]}>{s.desc}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Call ${s.name}`} onPress={() => Linking.openURL(`tel:${s.dial}`)}>
        <Text style={[st.num, dark && { color: C.cream }]}>☎ {s.phone}</Text>
        <Text style={[st.hrs, dark && { color: '#BDBEAF' }]}>{s.hrs}</Text>
      </Pressable>
    </Pressable>
  );
}

export default function PublicServices() {
  return (
    <ScrollView contentContainerStyle={st.page}>
      <View style={st.hero}>
        <Text style={st.mark}>☀</Text>
        <Text style={st.eyebrow}>PUBLIC SERVICES</Text>
        <Text style={st.title}>Need an official answer?</Text>
        <Text style={st.sub}>Tap a square to open the official page, or tap the number to call.</Text>
      </View>
      <View style={st.grid}>
        {SERVICES.map((s) => (
          <Square key={s.code} s={s} />
        ))}
      </View>
      <Text style={st.note}>
        Numbers come from official websites and can change. CouCouMTL is not affiliated with these services. In an emergency, call 911.
      </Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  page: { padding: 16, gap: 14, backgroundColor: C.cream },
  hero: { backgroundColor: C.yellow, borderRadius: 28, padding: 22, overflow: 'hidden', gap: 6 },
  mark: { position: 'absolute', top: -38, right: -15, fontSize: 158, color: '#F3BB25' },
  eyebrow: { color: C.ink, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: C.ink, fontSize: 34, lineHeight: 36, fontWeight: '900', letterSpacing: -1.5 },
  sub: { color: C.ink, fontSize: 15, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  square: {
    width: '48%',
    flexGrow: 1,
    minHeight: 190,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 24,
    padding: 14,
    justifyContent: 'space-between',
    gap: 8,
  },
  dark: { backgroundColor: C.ink, borderColor: C.ink },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  code: {
    backgroundColor: C.lilac,
    color: C.ink,
    fontWeight: '900',
    fontSize: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  arrow: { fontSize: 18, fontWeight: '900', color: C.ink },
  name: { fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  desc: { fontSize: 12, color: C.muted, lineHeight: 16 },
  num: { fontSize: 14, fontWeight: '900', color: C.ink },
  hrs: { fontSize: 11, fontWeight: '700', color: C.muted },
  note: { fontSize: 12, color: C.muted, lineHeight: 17, marginBottom: 24 },
});
