import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Shield, Route, FileText, Clock, Truck, MapPin, ArrowRight, Loader2, Pause, Play } from 'lucide-react';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Fleet Data', href: '#fleet-data' },
];

const features = [
  {
    icon: Shield,
    title: 'FMCSA Compliance',
    text: 'Full 49 CFR Part 395 compliance with automatic 30-minute break enforcement, 14-hour duty window tracking, and 70-hour cycle management.',
  },
  {
    icon: Route,
    title: 'Smart Route Planning',
    text: 'OSRM-powered routing with automatic fuel stop placement every 1,000 miles and optimized pickup/dropoff sequencing.',
  },
  {
    icon: FileText,
    title: 'ELD Log Generation',
    text: 'Auto-generate FMCSA-compliant daily log sheets with 24-hour grid visualization, duty status tracking, and 8-day recap tables.',
  },
  {
    icon: Clock,
    title: 'HOS State Machine',
    text: 'Real-time Hours of Service computation with midnight crossover handling, 34-hour restart detection, and rolling 70-hour cycle calculations.',
  },
];

const steps = [
  {
    stage: 'Step 1',
    title: 'Enter Your Route',
    text: 'Input your current location, pickup point, and dropoff destination. Set your current cycle hours used to get accurate compliance calculations.',
  },
  {
    stage: 'Step 2',
    title: 'Plan & Comply',
    text: 'Our HOS engine automatically computes optimal rest stops, fuel breaks, and 30-minute mandatory rests — all while maximizing your driving windows.',
  },
  {
    stage: 'Step 3',
    title: 'Export & Drive',
    text: 'Download FMCSA-compliant PDF log sheets, view turn-by-turn directions with integrated HOS events, and hit the road with full regulatory confidence.',
  },
];

const fleetData = [
  ['Dallas, TX → Chicago, IL', '1,082 mi', '19.6h', '2 days', 'Compliant'],
  ['Houston, TX → Atlanta, GA', '789 mi', '14.2h', '1 day', 'Compliant'],
  ['Los Angeles, CA → Phoenix, AZ', '373 mi', '6.8h', '1 day', 'Compliant'],
  ['New York, NY → Miami, FL', '1,280 mi', '22.4h', '2 days', 'Compliant'],
];

export default function LandingPage({ onEnterApp }) {
  const navRef = useRef(null);
  const videoRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setVideoPaused(false);
    } else {
      video.pause();
      setVideoPaused(true);
    }
  };

  return (
    <div className="overflow-x-hidden bg-[#02040a] text-slate-50 antialiased selection:bg-sky-400 selection:text-slate-950">
      {/* Navbar */}
      <nav
        ref={navRef}
        className={`fixed left-0 top-0 z-50 w-full border-b border-white/5 backdrop-blur-md transition-all duration-300 ${
          scrolled ? 'bg-[#02040a]/80 py-2' : 'bg-transparent py-4'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="#" className="group flex items-center gap-3" aria-label="ELD Trip Planner home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-400/10 transition-colors group-hover:border-sky-400">
              <Truck className="h-4 w-4 text-sky-400" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold tracking-tight">ELD Trip Planner</span>
          </a>

          <div className="hidden items-center gap-8 text-xs font-medium uppercase tracking-[0.15em] md:flex">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-slate-400 transition-colors hover:text-white">
                {link.label}
              </a>
            ))}
          </div>

          <button
            onClick={onEnterApp}
            className="rounded-none border border-white/10 px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-300 hover:bg-white hover:text-[#02040a] cursor-pointer active:scale-[0.97]"
          >
            Plan a Trip
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative flex h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 h-full w-full">
          <video ref={videoRef} autoPlay loop muted playsInline className="h-full w-full object-cover" aria-hidden="true">
            <source src="/video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-[#02040a]/80 via-transparent to-[#02040a]/20" />

          {/* Video pause/play control */}
          <button
            onClick={toggleVideo}
            className="absolute bottom-20 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition-colors hover:border-sky-400 hover:text-sky-400 cursor-pointer"
            aria-label={videoPaused ? 'Play background video' : 'Pause background video'}
          >
            {videoPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        </div>

        <div className="relative z-10 mx-auto mt-16 grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                FMCSA 49 CFR Part 395 Compliant
              </span>
            </div>

            <h1 className="mb-8 text-4xl font-black uppercase leading-none tracking-tighter md:text-6xl lg:text-7xl">
              Full Control <br />
              <span className="text-stroke">Over Hours</span> <br />
              Of Service
            </h1>

            <p className="mb-10 max-w-xl text-lg leading-relaxed text-slate-300 font-light">
              Plan routes, track driving hours, and generate FMCSA-compliant ELD logs — all in one place. Never exceed a duty limit again.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={onEnterApp}
                className="bg-sky-400 px-8 py-4 text-xs font-bold uppercase tracking-widest text-[#02040a] transition-colors duration-300 hover:bg-white cursor-pointer active:scale-[0.97]"
              >
                Start Planning
              </button>
              <a
                href="#features"
                className="bg-white/5 px-8 py-4 text-xs font-semibold uppercase tracking-widest text-white transition-colors duration-300 hover:bg-white/10 border border-white/10"
              >
                See Features
              </a>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 z-20 -translate-x-1/2">
          <a href="#features" className="group flex h-12 w-12 items-center justify-center rounded-full border border-white/10 transition-colors duration-300 hover:border-sky-400" aria-label="Scroll to features">
            <ChevronDown className="h-5 w-5 text-slate-400 transition-colors group-hover:text-sky-400" />
          </a>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl border-t border-white/5 px-6 py-32">
        <div className="grid items-center gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="mb-3 block text-xs font-bold uppercase tracking-[0.3em] text-sky-400">
              01 / Capabilities
            </span>
            <h2 className="mb-8 text-4xl font-extrabold uppercase tracking-tight md:text-5xl">
              Built for compliance. Designed for drivers.
            </h2>
            <p className="mb-6 leading-relaxed text-slate-400 font-light">
              Every feature is engineered around FMCSA regulations. No guesswork, no manual calculations — just accurate, real-time HOS tracking that keeps you on the road and out of trouble.
            </p>
            <p className="mb-8 leading-relaxed text-slate-400 font-light">
              From pre-trip inspections to 34-hour restarts, the engine handles every regulatory edge case so you can focus on the drive.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-white">70h</span>
                <span className="text-xs uppercase tracking-wider text-slate-500">Cycle Tracking</span>
              </div>
              <div className="h-10 w-px bg-white/10" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-white">14h</span>
                <span className="text-xs uppercase tracking-wider text-slate-500">Duty Window</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-7">
            {features.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="group border border-white/5 bg-[#090d16]/50 p-8 transition-all duration-300 hover:border-sky-400/30">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center bg-white/5 transition-colors group-hover:bg-sky-400/10">
                    <Icon className="h-6 w-6 text-slate-400 transition-colors group-hover:text-sky-400" aria-hidden="true" />
                  </div>
                  <h3 className="mb-4 text-lg font-bold uppercase tracking-tight text-white">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-400 font-light">{card.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative overflow-hidden border-y border-white/5 bg-[#090d16] py-32">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/5 blur-[160px]" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="mb-20 max-w-3xl">
            <span className="mb-3 block text-xs font-bold uppercase tracking-[0.3em] text-sky-400">
              02 / Workflow
            </span>
            <h2 className="text-4xl font-extrabold uppercase leading-none tracking-tight text-white md:text-6xl">
              Three steps to compliance.
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((item) => (
              <div key={item.stage} className="border-t border-white/10 pt-8">
                <span className="mb-4 block text-xs font-bold text-slate-500">{item.stage}</span>
                <h4 className="mb-4 text-xl font-bold uppercase tracking-tight text-white">{item.title}</h4>
                <p className="text-sm leading-relaxed text-slate-400 font-light">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fleet Data */}
      <section id="fleet-data" className="mx-auto max-w-7xl px-6 py-32">
        <div className="mb-20 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <span className="mb-3 block text-xs font-bold uppercase tracking-[0.3em] text-sky-400">
              03 / Route Intelligence
            </span>
            <h2 className="text-4xl font-extrabold uppercase tracking-tight">Compliance Dashboard</h2>
          </div>
          <div className="border-b border-white/10 pb-2 text-xs uppercase tracking-widest text-slate-400">
            Sample Fleet Routes
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-[600px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-widest text-slate-500">
                <th className="pb-6">Route</th>
                <th className="pb-6">Distance</th>
                <th className="pb-6">Drive Time</th>
                <th className="pb-6">Est. Days</th>
                <th className="pb-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm font-light">
              {fleetData.map((row) => {
                const [route, distance, driveTime, days, status] = row;
                return (
                  <tr key={route} className="transition-colors hover:bg-white/[0.02]">
                    <td className="py-6 font-bold uppercase tracking-wider text-white">{route}</td>
                    <td className="py-6 font-mono text-slate-300 tabular-nums">{distance}</td>
                    <td className="py-6 font-mono text-slate-300 tabular-nums">{driveTime}</td>
                    <td className="py-6 text-slate-300">{days}</td>
                    <td className="py-6 text-right">
                      <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-sky-400/10 text-sky-400">
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-white/5 bg-[#04060e] py-40">
        <div className="absolute inset-0 mix-blend-color-dodge opacity-20" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:32px_32px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <div className="mx-auto mb-10 flex h-16 w-16 items-center justify-center rounded-full border border-sky-400/30 bg-sky-400/5 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
            <MapPin className="h-6 w-6 text-sky-400" aria-hidden="true" />
          </div>

          <h2 className="mb-6 text-4xl font-black uppercase tracking-tight text-white md:text-6xl">
            Ready to Roll?
          </h2>

          <p className="mx-auto mb-12 max-w-xl text-base leading-relaxed text-slate-400 font-light md:text-lg">
            Plan your next trip with full FMCSA compliance. Input your route, get instant HOS calculations, and export driver-ready log sheets.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onEnterApp}
              className="bg-white px-10 py-4 text-xs font-bold uppercase tracking-widest text-[#02040a] transition-colors duration-300 hover:bg-sky-400 cursor-pointer active:scale-[0.97]"
            >
              Start Planning Now
            </button>
          </div>

          <div className="mt-8 text-[10px] uppercase tracking-[0.25em] text-slate-500">
            FMCSA 49 CFR Part 395 Compliant &mdash; Free to Use
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#02040a] px-6 py-20">
        <div className="mx-auto mb-16 grid max-w-7xl grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-400/10">
                <Truck className="h-4 w-4 text-sky-400" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold tracking-tight">ELD Trip Planner</span>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-slate-500 font-light">
              Full-stack FMCSA ELD &amp; Hours of Service trip planning platform. Built with Django, React, OSRM routing, and a complete HOS state machine.
            </p>
          </div>

          <div className="md:col-span-3">
            <h5 className="mb-6 text-xs font-bold uppercase tracking-widest text-white">Platform</h5>
            <ul className="space-y-3 text-[11px] uppercase tracking-wider text-slate-500">
              <li><a href="#features" className="transition-colors hover:text-sky-400">Features</a></li>
              <li><a href="#how-it-works" className="transition-colors hover:text-sky-400">How It Works</a></li>
              <li><a href="#fleet-data" className="transition-colors hover:text-sky-400">Fleet Data</a></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h5 className="mb-6 text-xs font-bold uppercase tracking-widest text-white">Compliance</h5>
            <ul className="space-y-3 text-[11px] uppercase tracking-wider text-slate-500">
              <li><span className="text-slate-400">49 CFR Part 395</span></li>
              <li><span className="text-slate-400">70h / 8-Day Cycle</span></li>
              <li><span className="text-slate-400">14h Duty Window</span></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h5 className="mb-6 text-xs font-bold uppercase tracking-widest text-white">Tech Stack</h5>
            <ul className="space-y-3 text-[11px] uppercase tracking-wider text-slate-500">
              <li><span className="text-slate-400">Django REST</span></li>
              <li><span className="text-slate-400">React + Vite</span></li>
              <li><span className="text-slate-400">OSRM Routing</span></li>
            </ul>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-[11px] text-slate-600 sm:flex-row">
          <div>ELD TRIP PLANNER &copy; 2026</div>
          <div className="flex items-center gap-2 uppercase tracking-widest text-[10px]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            System Online
          </div>
        </div>
      </footer>
    </div>
  );
}
