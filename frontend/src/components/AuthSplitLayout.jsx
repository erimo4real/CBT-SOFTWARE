import { GraduationCap } from 'lucide-react';

export default function AuthSplitLayout({ children, subtitle }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70">
        {/* Decorative orbs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-white/5 blur-2xl" />

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
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-6 sm:p-8">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">CBT</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
