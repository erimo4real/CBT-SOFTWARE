import { GraduationCap } from 'lucide-react';

export default function AuthSplitLayout({ children, subtitle }) {
  return (
    <div className="min-h-screen flex relative">
      {/* Background image — visible on mobile/tablet, hidden on desktop (handled by left panel) */}
      <div className="lg:hidden absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/85 via-slate-900/80 to-slate-900/75" />
      </div>

      {/* Left panel — branding with background image (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 via-slate-900/75 to-slate-900/65" />
        {/* Subtle decorative orbs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-white/5 blur-2xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-20 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">CBT</span>
          </div>

          <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
            {subtitle || (
              <>
                Empowering Knowledge,
                <br />
                One Exam at a Time
              </>
            )}
          </h2>

          <p className="text-lg text-white/80 max-w-md leading-relaxed">
            A comprehensive computer-based testing and learning platform designed for modern education.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 mt-10">
            {['Secure Exams', 'Real-time Analytics', 'AI-Powered Learning'].map((f) => (
              <span key={f} className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-white/90">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center relative z-10 p-6 sm:p-8 lg:bg-gradient-to-br lg:from-background lg:via-background lg:to-muted/30">
        <div className="w-full max-w-sm">
          {/* Mobile/tablet branding */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">CBT</span>
              <p className="text-xs text-white/60 -mt-0.5">Computer-Based Testing</p>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
