import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { ROUTES } from "@/shared/config/routes";
import { Button } from "@/shared/components/ui/button";
import {
  MapPin,
  FileText,
  Shield,
  ArrowRight,
  CheckCircle2,
  Users,
  Clock,
  Award,
  Sparkles,
  Zap,
  Map,
  Building2,
  Layers,
  Cpu,
  CheckCheck,
  TrendingUp,
  Flame,
  Search,
  ExternalLink,
  ChevronRight,
  Radio,
  BarChart3,
  HardHat,
  Eye,
  AlertTriangle,
  Send,
  Droplets,
  Lightbulb
} from "lucide-react";

export default function Landing() {
  const { language } = useLanguage();

  const isHi = language === "hi";

  const stats = [
    {
      value: "50K+",
      label: isHi ? "हल की गई समस्याएं" : "Issues Resolved",
      subtext: isHi ? "सत्यापित समाधान" : "Verified across Bhopal",
    },
    {
      value: "2.5L+",
      label: isHi ? "सक्रिय नागरिक" : "Active Citizens",
      subtext: isHi ? "85 वार्डों में पंजीकृत" : "Across 85 Wards",
    },
    {
      value: "94%",
      label: isHi ? "समाधान दर" : "Resolution Rate",
      subtext: isHi ? "समय सीमा के भीतर" : "Within Official SLA",
    },
    {
      value: "24-48h",
      label: isHi ? "औसत निवारण समय" : "Avg. Resolution Time",
      subtext: isHi ? "त्वरित फील्ड कार्रवाई" : "Rapid Municipal Action",
    },
  ];

  const features = [
    {
      icon: <Cpu className="w-6 h-6 text-primary" />,
      badgeBg: "bg-primary/10",
      title: isHi ? "AI क्षति और गंभीरता पहचान" : "AI Damage & Severity Detection",
      description: isHi
        ? "तस्वीर अपलोड करते ही स्वचालित श्रेणी वर्गीकरण, गंभीरता स्कोर और डुप्लिकेट शिकायत पहचान।"
        : "Automated image recognition, severity grading, and immediate duplicate complaint filtering.",
    },
    {
      icon: <Map className="w-6 h-6 text-indigo-500" />,
      badgeBg: "bg-indigo-500/10",
      title: isHi ? "GIS-आधारित वार्ड लोकेशन मैपिंग" : "GIS-Based Ward & Location Mapping",
      description: isHi
        ? "सटीक जियो-कोऑर्डिनेट मैपिंग और वार्ड क्लस्टरिंग जिससे संबंधित अधिकारी तुरंत स्पॉट पर पहुंचे।"
        : "Precise geospatial coordinate mapping and ward-level clustering for pinpoint municipal routing.",
    },
    {
      icon: <CheckCheck className="w-6 h-6 text-emerald-500" />,
      badgeBg: "bg-emerald-500/10",
      title: isHi ? "पारदर्शी समाधान कार्यप्रवाह" : "Structured Resolution Workflows",
      description: isHi
        ? "लाइव प्रगति ट्रैकिंग, फील्ड इंजीनियर की फोटो प्रमाण और नागरिक पुष्टि के साथ पूर्ण ऑडिट ट्रेल।"
        : "End-to-end milestone tracking with engineer photo proofs, SLA timers, and citizen confirmation.",
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      badgeBg: "bg-amber-500/10",
      title: isHi ? "रीयल-टाइम बहुभाषी अलर्ट" : "Real-Time Multilingual Alerts",
      description: isHi
        ? "हिंदी और अंग्रेजी में तुरंत स्थिति अपडेट और आपके क्षेत्र की गतिविधियों का लाइव सारांश।"
        : "Instant status notifications and seamless Hindi & English accessibility directly on your dashboard.",
    },
  ];

  const steps = [
    {
      num: "01",
      icon: <MapPin className="w-6 h-6 text-amber-500" />,
      iconBg: "bg-amber-500/10 border-amber-500/20",
      title: isHi ? "समस्या दर्ज करें" : "Report Civic Issue",
      description: isHi
        ? "फोटो खींचें, संक्षिप्त विवरण दें और ऑटो-डिटेक्टेड जीपीएस लोकेशन के साथ सबमिट करें।"
        : "Snap a photo, add details or a voice note with automatic GPS coordinates and ward detection.",
    },
    {
      num: "02",
      icon: <Sparkles className="w-6 h-6 text-rose-500" />,
      iconBg: "bg-rose-500/10 border-rose-500/20",
      title: isHi ? "AI वर्गीकरण व रूटिंग" : "AI Verification & Routing",
      description: isHi
        ? "AI इंजन श्रेणी पहचानता है, प्राथमिकता तय करता है और सीधे संबंधित नगर निगम विभाग को भेजता है।"
        : "The AI engine classifies the issue, assigns urgency score, and routes directly to the designated department.",
    },
    {
      num: "03",
      icon: <HardHat className="w-6 h-6 text-sky-500" />,
      iconBg: "bg-sky-500/10 border-sky-500/20",
      title: isHi ? "फील्ड मरम्मत कार्रवाई" : "Municipal Action & Repair",
      description: isHi
        ? "क्षेत्रीय इंजीनियर वर्क आर्डर प्राप्त करते हैं, टीम तैनात करते हैं और समाधान फोटो अपलोड करते हैं।"
        : "Field engineers receive work orders, dispatch repair teams, and upload resolution proof photos.",
    },
    {
      num: "04",
      icon: <Award className="w-6 h-6 text-emerald-500" />,
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      title: isHi ? "नागरिक सत्यापन व पुरस्कार" : "Citizen Verification & XP",
      description: isHi
        ? "नागरिक समाधान की पुष्टि करते हैं, कम्युनिटी हीरो XP व बैज जीतते हैं और वार्ड स्कोर बढ़ाते हैं।"
        : "Community verifies the fix, earns Community Hero XP, unlocks badges, and boosts ward civic score.",
    },
  ];

  const departments = [
    {
      code: "BMC",
      name: isHi ? "भोपाल नगर निगम (BMC)" : "Bhopal Municipal Corporation (BMC)",
      desc: isHi ? "शहरी निकाय, स्वच्छता एवं कचरा प्रबंधन" : "Urban Local Body & Public Sanitation Services",
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    {
      code: "PWD",
      name: isHi ? "लोक निर्माण विभाग (PWD)" : "Public Works Department (PWD)",
      desc: isHi ? "मुख्य सड़कें, फ्लाईओवर व पुल निर्माण" : "Main Arterial Roads, Flyovers & Bridge Infrastructure",
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    {
      code: "BSCDCL",
      name: isHi ? "भोपाल स्मार्ट सिटी डेवलपमेंट (BSCDCL)" : "Bhopal Smart City Development Corp",
      desc: isHi ? "स्मार्ट सेंसर ग्रिड एवं आईओटी निगरानी" : "Smart Sensor Grid & Urban IoT Surveillance",
      color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    },
    {
      code: "MPMKVVCL",
      name: isHi ? "मध्य क्षेत्र विद्युत वितरण कंपनी" : "MP Madhya Kshetra Vidyut Vitaran",
      desc: isHi ? "विद्युत ग्रिड, ट्रांसफार्मर एवं स्ट्रीटलाइट" : "Power Distribution & Streetlighting Grids",
      color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    },
    {
      code: "NVDA",
      name: isHi ? "नर्मदा घाटी एवं जल कार्य विभाग" : "Narmada Valley & Water Works",
      desc: isHi ? "पेयजल आपूर्ति, पाइपलाइन व सीवरेज" : "Water Supply Pipelines & Sewerage Networks",
      color: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    },
    {
      code: "TP",
      name: isHi ? "ट्रैफिक पुलिस एवं नागरिक सुरक्षा" : "Traffic Police & Civic Enforcement",
      desc: isHi ? "सड़क सुरक्षा, सिग्नल समन्वय व अतिक्रमण" : "Road Safety, Signal Systems & Encroachment Removal",
      color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    },
  ];

  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* ── TOP HERO SECTION ── */}
      <section className="relative pt-4 pb-8 sm:pt-6 sm:pb-10 overflow-hidden border-b border-border/40">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 text-left space-y-4">
              {/* Mission Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {isHi
                    ? "स्मार्ट सिटी मिशन • भोपाल नगर निगम के तत्वावधान में"
                    : "Under the aegis of Bhopal Municipal Corporation & Smart Cities Mission"}
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-[1.15]">
                {isHi ? (
                  <>
                    एक शहर। <br />
                    एक मंच। <br />
                    <span className="text-primary">एक योजना।</span>
                  </>
                ) : (
                  <>
                    One City. <br />
                    One Platform. <br />
                    <span className="text-primary">One Plan.</span>
                  </>
                )}
              </h1>

              {/* Subtext */}
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed font-normal">
                {isHi
                  ? "रीयल-टाइम एआई आधारित नागरिक समस्या निवारण, जीआईएस लोकेशन इंटेलिजेंस और पारदर्शी नगरपालिका समन्वय द्वारा अपने शहर को बेहतर बनाएं।"
                  : "Eliminate civic delays, report neighborhood issues instantly, and track real-time resolution with AI-powered municipal coordination."}
              </p>

              {/* Authority Note */}
              <p className="text-xs font-semibold text-foreground/80 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                {isHi
                  ? "भोपाल स्मार्ट सिटी मिशन और 85 वार्डों के लिए एकीकृत नागरिक सेवा पोर्टल"
                  : "Unified Citizen & Inter-Departmental Grievance Redressal Portal"}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link to={ROUTES.REPORT_ISSUE}>
                  <Button className="bg-[#0B3B60] hover:bg-[#082a45] text-white font-bold px-5 py-5 rounded-2xl shadow-lg shadow-[#0B3B60]/20 gap-2 text-sm group transition-all">
                    <FileText className="w-4 h-4" />
                    <span>{isHi ? "समस्या दर्ज करें" : "Report an Issue"}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to={ROUTES.CIVIC_MAP}>
                  <Button
                    variant="outline"
                    className="font-bold px-5 py-5 rounded-2xl border-border/80 hover:bg-muted/60 text-foreground gap-2 text-sm transition-all"
                  >
                    <Map className="w-4 h-4 text-primary" />
                    <span>{isHi ? "नागरिक मानचित्र देखें" : "View Civic Map"}</span>
                  </Button>
                </Link>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-border/60">
                {stats.map((stat, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <p className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                      {stat.value}
                    </p>
                    <p className="text-xs font-bold text-foreground/80">{stat.label}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.subtext}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Hero Visual Mockup: GIS Radar & Live Issues */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Main Card */}
                <div className="bg-card border-2 border-border/90 rounded-3xl p-4 shadow-xl space-y-3 text-left relative overflow-hidden backdrop-blur-sm">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        🏛️
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {isHi ? "भोपाल स्मार्ट सिटी • जीआईएस ग्रिड" : "Smart City Bhopal • GIS Grid"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          Ward 34 • MP Nagar Zone
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      Live Feed
                    </span>
                  </div>

                  {/* Mock Radar Grid Visual */}
                  <div className="relative h-56 sm:h-64 w-full rounded-2xl bg-muted/20 border border-border/60 overflow-hidden flex items-center justify-center">
                    {/* Grid Pattern Lines */}
                    <div
                      className="absolute inset-0 opacity-25"
                      style={{
                        backgroundImage: `linear-gradient(to right, #888 1px, transparent 1px), linear-gradient(to bottom, #888 1px, transparent 1px)`,
                        backgroundSize: "28px 28px",
                      }}
                    />

                    {/* Concentric Radar Rings */}
                    <div className="absolute w-44 h-44 rounded-full border border-primary/20 animate-ping opacity-20" />
                    <div className="absolute w-36 h-36 rounded-full border border-primary/30" />
                    <div className="absolute w-20 h-20 rounded-full border border-primary/40 bg-primary/5" />

                    {/* Center Pin */}
                    <div className="relative z-10 w-7 h-7 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
                      <div className="w-2 rounded-full bg-rose-500" />
                    </div>

                    {/* Surrounding Issue Nodes */}
                    <div className="absolute top-10 left-10 flex items-center gap-1 px-2 py-0.5 bg-card/90 backdrop-blur-md rounded-xl border border-border/80 shadow-sm text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{isHi ? "रोड लाइट हल" : "Light Fixed"}</span>
                    </div>

                    <div className="absolute bottom-10 left-12 flex items-center gap-1 px-2 py-0.5 bg-card/90 backdrop-blur-md rounded-xl border border-border/80 shadow-sm text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span>{isHi ? "जल पाइपलाइन" : "Water Pipe"}</span>
                    </div>

                    <div className="absolute top-12 right-8 flex items-center gap-1 px-2 py-0.5 bg-card/90 backdrop-blur-md rounded-xl border border-border/80 shadow-sm text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{isHi ? "गड्ढा मरम्मत" : "Pothole"}</span>
                    </div>

                    <div className="absolute bottom-5 right-6 flex items-center gap-1 px-2 py-0.5 bg-card/90 backdrop-blur-md rounded-xl border border-border/80 shadow-sm text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      <span>{isHi ? "सफाई कार्य" : "Sanitation"}</span>
                    </div>
                  </div>

                  {/* Card Bottom Status */}
                  <div className="flex items-center justify-between pt-0.5 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {isHi ? "5 सक्रिय परियोजनाएं" : "5 Active Projects"}
                    </span>
                    <Link
                      to={ROUTES.CIVIC_MAP}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                    >
                      <span>{isHi ? "मानचित्र खोलें" : "Open Radar"}</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: EVERYTHING YOUR CITY NEEDS ── */}
      <section className="py-10 sm:py-12 bg-muted/20 border-b border-border/40">
        <div className="container mx-auto px-4 sm:px-6 text-center max-w-5xl space-y-8">
          <div className="space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {isHi
                ? "आपके शहर की हर जरूरत, एक ही स्थान पर"
                : "Everything your city needs, in one place"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isHi
                ? "नागरिकों और नगर पालिका विभागों के बीच बिना किसी देरी या डुप्लिकेट शिकायतों के सहज समन्वय के लिए निर्मित।"
                : "Built for citizens and municipal departments to coordinate civic infrastructure without conflicts, delays, or duplicated effort."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-card rounded-3xl border border-border/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-primary/40 transition-all space-y-2.5 group"
              >
                <div className={`w-10 h-10 rounded-2xl ${f.badgeBg} flex items-center justify-center transition-transform group-hover:scale-105`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-foreground">{f.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: HOW REDRESSAL WORKS (4 STEP CARDS) ── */}
      <section className="py-10 sm:py-12 border-b border-border/40">
        <div className="container mx-auto px-4 sm:px-6 text-center max-w-5xl space-y-8">
          <div className="space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {isHi
                ? "नागरिक समस्या समाधान कैसे कार्य करता है"
                : "How Coordinated Redressal Works"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isHi
                ? "हमारी स्वचालित प्रणाली शिकायत दर्ज करने से लेकर फील्ड सत्यापन व समाधान तक हर कदम पर मार्गदर्शन करती है।"
                : "Our automated system guides issues through proposal, AI verification, municipal repair, and final community verification."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {steps.map((s, i) => (
              <div
                key={i}
                className="bg-card rounded-3xl border border-border/80 p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-2xl border ${s.iconBg} flex items-center justify-center`}>
                    {s.icon}
                  </div>
                  <span className="text-xs font-black text-muted-foreground/60 tracking-wider">
                    {s.num}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: INTEGRATED BHOPAL DEPARTMENTS ── */}
      <section className="py-10 sm:py-12 bg-muted/20 border-b border-border/40">
        <div className="container mx-auto px-4 sm:px-6 text-center max-w-5xl space-y-8">
          <div className="space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {isHi
                ? "एकीकृत भोपाल नगर पालिका विभाग"
                : "Integrated Bhopal Departments"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isHi
                ? "मध्य प्रदेश शासन और नगर निकायों के बीच रीयल-टाइम शिकायत समाधान एवं डेटा सिंक्रनाइज़ेशन।"
                : "Real-time pipeline data and project synchronization across Madhya Pradesh state and municipal bodies."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {departments.map((dept, i) => (
              <div
                key={i}
                className="bg-card rounded-3xl border border-border/80 p-4 shadow-sm hover:border-primary/40 transition-all flex items-start gap-3.5"
              >
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${dept.color}`}>
                  {dept.code.slice(0, 2)}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug truncate">
                    {dept.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {dept.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: PUBLIC TRANSPARENCY ── */}
      <section className="py-10 sm:py-12 border-b border-border/40">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Info Column */}
            <div className="lg:col-span-5 text-left space-y-4">
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-wider">
                {isHi ? "सार्वजनिक पारदर्शिता" : "PUBLIC TRANSPARENCY"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
                {isHi
                  ? "नागरिकों का सशक्तिकरण। जवाबदेह शासन।"
                  : "Empowering Citizens. Ensuring Accountable Infrastructure."}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {isHi
                  ? "समाधान मंच स्थानीय निवासियों को सीधे नगर निगम के समन्वय डेटा से जोड़ता है। नागरिक सक्रिय मरम्मत कार्य देख सकते हैं, सुरक्षा चिंताएं दर्ज कर सकते हैं और फीडबैक दे सकते हैं।"
                  : "Samadhan connects local residents directly with municipal coordination data. Citizens can view live issues, report safety concerns, or provide feedback on public infrastructure."}
              </p>
              <Link
                to={ROUTES.DASHBOARD}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-primary hover:underline"
              >
                <span>{isHi ? "सार्वजनिक पोर्टल खोलें" : "Enter Public Portal"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Right 3 Action Cards */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left">
              {/* Card 1: Live Map */}
              <div className="bg-card rounded-3xl border border-border/80 p-4 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Map className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    {isHi ? "लाइव नागरिक मानचित्र" : "Live Civic Map"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isHi
                      ? "भोपाल में सक्रिय और हल की गई समस्याओं को रीयल-टाइम में देखें।"
                      : "View active and resolved civic issues across Bhopal in real-time."}
                  </p>
                </div>
                <Link
                  to={ROUTES.CIVIC_MAP}
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>{isHi ? "मानचित्र खोलें" : "Open Map"}</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Card 2: Report */}
              <div className="bg-card rounded-3xl border border-border/80 p-4 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    {isHi ? "शिकायत दर्ज करें" : "Report Civic Issue"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isHi
                      ? "सड़क, पानी या स्वच्छता संबंधी समस्याओं की तुरंत रिपोर्ट करें।"
                      : "File complaints regarding potholes, water leaks, or public sanitation."}
                  </p>
                </div>
                <Link
                  to={ROUTES.REPORT_ISSUE}
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>{isHi ? "रिपोर्ट करें" : "File Report"}</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Card 3: Hero Leaderboard */}
              <div className="bg-card rounded-3xl border border-border/80 p-4 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    {isHi ? "कम्युनिटी लीडरबोर्ड" : "Community Hero"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isHi
                      ? "समस्या समाधान सत्यापित करें, अंक अर्जित करें और अपने वार्ड का नेतृत्व करें।"
                      : "Verify civic repairs, earn XP badges, and lead your neighborhood ranking."}
                  </p>
                </div>
                <Link
                  to={`${ROUTES.PROFILE}?tab=hero`}
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>{isHi ? "लीडरबोर्ड देखें" : "View Rankings"}</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: READY TO COORDINATE SMARTER (NAVY CTA BANNER) ── */}
      <section className="py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <div className="bg-[#0B3B60] text-white rounded-2xl p-5 sm:p-7 text-center space-y-3 shadow-lg relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-16 -top-16 w-48 h-48 bg-primary/30 rounded-full blur-2xl pointer-events-none" />

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight relative z-10">
              {isHi ? "क्या आप स्मार्ट समाधान के लिए तैयार हैं?" : "Ready to coordinate smarter?"}
            </h2>
            <p className="text-xs text-white/80 max-w-lg mx-auto leading-relaxed relative z-10">
              {isHi
                ? "भोपाल भर के हजारों नागरिकों और नगर निगम टीमों से जुड़ें जो पहले से ही बेहतर बुनियादी ढांचे के लिए समाधान का उपयोग कर रहे हैं।"
                : "Join citizens and municipal departments across Bhopal already using Samadhan to eliminate civic delays and build better infrastructure."}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 relative z-10">
              <Link to={ROUTES.REPORT_ISSUE}>
                <Button className="bg-white hover:bg-white/90 text-[#0B3B60] font-bold px-5 py-2.5 rounded-xl shadow-md gap-1.5 text-xs transition-all">
                  <span>{isHi ? "समस्या दर्ज करें" : "Report an Issue"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Link to={ROUTES.CIVIC_MAP}>
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 font-bold px-5 py-2.5 rounded-xl gap-1.5 text-xs transition-all"
                >
                  <Map className="w-3.5 h-3.5 text-white" />
                  <span>{isHi ? "नागरिक पोर्टल देखें" : "Citizen Portal"}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
