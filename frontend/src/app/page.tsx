import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const features = [
  { title: 'Outstanding Teaching', desc: 'Our experienced and passionate teachers deliver engaging lessons that inspire curiosity and foster a love of learning.', icon: '📚' },
  { title: 'Supportive Community', desc: 'We create a warm, inclusive environment where every pupil feels valued, safe, and encouraged to reach their potential.', icon: '🤝' },
  { title: 'Modern Facilities', desc: 'From our science laboratories to our sports pitches, our facilities are designed to provide the best possible learning experience.', icon: '🏫' },
  { title: 'Holistic Development', desc: 'We nurture the whole child through a rich programme of academic, creative, sporting, and extra-curricular activities.', icon: '🌟' },
];

const stats = [
  { value: '98%', label: 'GCSE Pass Rate' },
  { value: '1:15', label: 'Teacher to Pupil Ratio' },
  { value: '45+', label: 'Extra-Curricular Clubs' },
  { value: '25+', label: 'Years of Excellence' },
];

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tMiAwVjI4SDI2djJoOHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Nurturing Excellence, Building Futures
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-brand-100 sm:text-xl">
              Welcome to Frannberry School. We provide outstanding education in a supportive, inclusive community where every child is inspired to achieve their very best.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/admissions" className="btn-accent text-base">
                Apply for Admissions
              </Link>
              <Link href="/about" className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20">
                Learn More About Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-brand-700 sm:text-4xl">{stat.value}</div>
                <div className="mt-1 text-sm font-medium text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Why Choose Frannberry?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
              We are proud of our track record in delivering exceptional education. Here is what sets us apart.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="card text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-2xl">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-700 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to Join the Frannberry Family?</h2>
          <p className="mt-4 text-lg text-brand-100">
            We welcome applications from families who share our commitment to excellence and community.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/admissions" className="btn-accent text-base">
              Start Your Application
            </Link>
            <Link href="/contact" className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
