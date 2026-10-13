import React from "react";
import { Text, View } from "react-native";
import { font, r, Theme } from "./theme";
import { Button, Icon, Txt } from "./ui";
import { TAXONOMY_STATS } from "./data";

/** The web landing below the hero: problem vs solution, evidence, how it works, numbers, scope. */
export function Landing({ th, onHow }: { th: Theme; onHow: () => void }) {
  const Section = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
    <View style={{ width: "100%", maxWidth: 1040, gap: 18, paddingVertical: 36, borderTopWidth: 1, borderTopColor: th.line }}>
      <View style={{ gap: 4, alignItems: "center" }}>
        <Txt th={th} v="h1" style={{ fontSize: 28, lineHeight: 34, textAlign: "center" }}>{title}</Txt>
        {sub ? <Txt th={th} color={th.muted} style={{ textAlign: "center" }}>{sub}</Txt> : null}
      </View>
      {children}
    </View>
  );
  const Card = ({ children, tone, flex = 1 }: { children: React.ReactNode; tone?: "bad" | "ok"; flex?: number }) => (
    <View style={{ flex, minWidth: 280, gap: 12, padding: 20, borderRadius: r.xl, backgroundColor: th.surface, borderWidth: 1, borderColor: th.line, borderTopWidth: tone ? 3 : 1, borderTopColor: tone === "bad" ? th.neg : tone === "ok" ? th.pos : th.line }}>
      {children}
    </View>
  );
  const Row = ({ icon, color, text }: { icon: any; color: string; text: string }) => (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <Icon name={icon} size={16} color={color} />
      <Txt th={th} v="small" style={{ flex: 1 }}>{text}</Txt>
    </View>
  );
  const Quote = ({ text, who }: { text: string; who: string }) => (
    <View style={{ padding: 12, borderRadius: r.md, backgroundColor: th.sunken, gap: 4 }}>
      <Txt th={th} v="small" style={{ fontStyle: "italic" }}>"{text}"</Txt>
      <Txt th={th} v="tiny" color={th.muted}>{who}</Txt>
    </View>
  );
  const Stat = ({ n, label }: { n: string; label: string }) => (
    <View style={{ flex: 1, minWidth: 150, padding: 16, borderRadius: r.lg, backgroundColor: th.surface, borderWidth: 1, borderColor: th.line, gap: 2 }}>
      <Text style={{ fontFamily: font.display, fontSize: 28, color: th.ink }}>{n}</Text>
      <Txt th={th} v="small" color={th.muted}>{label}</Txt>
    </View>
  );
  const Step = ({ n, title, body, foot }: { n: number; title: string; body: string; foot: string }) => (
    <Card>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: th.brandTint, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: font.bodySemi, fontSize: 13, color: th.brand }}>{n}</Text></View>
      <Txt th={th} v="h3">{title}</Txt>
      <Txt th={th} v="small" color={th.muted}>{body}</Txt>
      <Txt th={th} v="smallMed" color={th.brand}>{foot}</Txt>
    </Card>
  );

  return (
    <View style={{ width: "100%", alignItems: "center", paddingHorizontal: 24, paddingBottom: 48 }}>
      <Section title="The problem vs the fix" sub="Razorpay onboarding is fast for the merchant whose paperwork is perfect. Everyone else finds out what's wrong after they pay.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          <Card tone="bad">
            <Txt th={th} v="smallMed" color={th.neg}>TODAY</Txt>
            <Row icon="x" color={th.neg} text="₹199 + GST is charged before any check. Reviews call it 'a fee for rejection'." />
            <Row icon="x" color={th.neg} text="Requirements arrive one at a time, days apart: a page, then a document, then an affidavit." />
            <Row icon="x" color={th.neg} text="'PAN doesn't match' with no reason. One merchant spent 4 months on a missing middle name." />
            <Row icon="x" color={th.neg} text="Video KYC (physical PAN, pen, morning slots) is revealed only after submission." />
            <Quote text="I have sent over 5 scratched pages from chequebook which each time they kept refusing saying there is issue but they don't even know what the issue is." who="r/indianstartups, merchant, 2025" />
          </Card>
          <Card tone="ok">
            <Txt th={th} v="smallMed" color={th.pos}>WITH PRE-FLIGHT</Txt>
            <Row icon="check" color={th.pos} text="Category checked against Razorpay's own 340-row taxonomy. Blocked means no fee, ever." />
            <Row icon="check" color={th.pos} text="Every requirement shown up front: documents, website policy pages, Video KYC prep and slot." />
            <Row icon="check" color={th.pos} text="PAN, Aadhaar and bank names reconciled word by word, with the cheapest fix named." />
            <Row icon="check" color={th.pos} text="One question at a time, voice or text, English or Hinglish. About 90 seconds." />
            <Quote text="Merchants don't mind filling forms. They mind paying ₹199 and then being rejected for a reason they could have been told on day one." who="The finding all nine research methods pointed to" />
          </Card>
        </View>
      </Section>

      <Section title="How it works" sub="Four checks before the pay button, inside the Razorpay merchant app.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          <Step n={1} title="Say what you sell" body="Free text or voice, Hinglish welcome. A retriever picks 8 of 340 sub-categories; the model chooses only among those; a fixed policy decides. If the verdict depends on something unsaid, it asks one question." foot="AI reads, rules decide" />
          <Step n={2} title="Know your route" body="A consented registry lookup says whether you're verified instantly or need a 5-minute video call. If it's the call, you see what to keep ready and book a slot now." foot="No surprises after paying" />
          <Step n={3} title="Match your names" body="The model reads PAN, Aadhaar and bank proof. A deterministic engine handles order, initials, honorifics, Devanagari and Telugu, spelling variants, and scores the match the way the ₹1 bank check will." foot="Fix it before the bank check" />
          <Step n={4} title="Check your site" body="If you'll take payments on a website, it's fetched the way a reviewer opens it and checked for terms, privacy, refund, shipping and contact pages." foot="The pages reviewers reject you for" />
        </View>
      </Section>

      <Section title="Measured, not asserted" sub="Two labelled test sets ship inside the app. Press 'See how it works' and run the category set against the live model yourself.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <Stat n="340" label={`sub-categories, ${TAXONOMY_STATS.not_supported} blocked, ${TAXONOMY_STATS.needs_review} human-reviewed`} />
          <Stat n="90–91%" label="of 146 labelled descriptions told the right status across runs (EN, Hinglish, Telugu, adversarial); every miss is a cautious deferral" />
          <Stat n="0 / 76" label="blocked or reviewed businesses wrongly told 'supported'" />
          <Stat n="14 / 14" label="adversarial re-wordings of blocked businesses caught" />
          <Stat n="303 / 304" label="name pairs judged correctly, 0 false passes" />
          <Stat n="21%" label="asked a question or deferred to a human instead of guessing" />
        </View>
        <Txt th={th} v="tiny" color={th.faint}>Both sets were written by the author, so these are regression numbers, not a field measurement. Thresholds were tuned on the same sets.</Txt>
        <View style={{ alignItems: "center" }}><Button th={th} kind="secondary" compact icon="cpu" label="See how it works and run the eval" onPress={onHow} /></View>
      </Section>

      <Section title="Why this, and why it isn't built yet" sub="Nine research methods: merchant conversations, a live audit as a real applicant, an AI agent as a novice user, Play Store and Trustpilot reviews, 16 Reddit threads, 4 YouTube tutorials, Razorpay's docs and RBI directions, 8 competitors, and testing the engine on real inputs.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          <Card>
            <Txt th={th} v="h3">What's regulation and what's a choice</Txt>
            <Txt th={th} v="small" color={th.muted}>CKYC, address verification and the aggregator's due-diligence liability are mandated. Fee timing, hidden category rules and drip-fed requirements are product choices. Pre-flight only moves the choices.</Txt>
          </Card>
          <Card>
            <Txt th={th} v="h3">Explain what, never why</Txt>
            <Txt th={th} v="small" color={th.muted}>Anti-money-laundering rules forbid telling a merchant what triggered a risk flag. So Pre-flight explains requirements (category policy, documents, name match, website pages) and never risk signals. That boundary is why "just add better error messages" is harder than it sounds.</Txt>
          </Card>
          <Card>
            <Txt th={th} v="h3">Deliberately not built</Txt>
            <Txt th={th} v="small" color={th.muted}>AI approvals or risk decisions; workarounds for restricted categories; the clarification loop after submission; settlement holds after activation; real registry, penny-drop or payment integrations. The first two are next.</Txt>
          </Card>
        </View>
      </Section>
    </View>
  );
}
