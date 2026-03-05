import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="bg-gradient-to-br from-brand-800 to-brand-900 py-16 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold sm:text-5xl">About Frannberry School</h1>
            <p className="mt-4 max-w-2xl text-lg text-brand-100">Established in 1998, we have a proud tradition of academic excellence, pastoral care, and community spirit.</p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="prose prose-lg max-w-none">
              <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
              <p className="mt-4 text-gray-600 leading-relaxed">At Frannberry School, our mission is to nurture every child&apos;s potential through outstanding teaching, a rich and challenging curriculum, and a warm, inclusive community. We believe every pupil deserves to feel valued, inspired, and supported on their educational journey.</p>

              <h2 className="mt-12 text-2xl font-bold text-gray-900">Our Values</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {[
                  { title: 'Excellence', desc: 'We set high expectations and support every pupil to achieve their personal best.' },
                  { title: 'Respect', desc: 'We treat one another with kindness, dignity, and consideration at all times.' },
                  { title: 'Integrity', desc: 'We act with honesty and take responsibility for our actions.' },
                  { title: 'Community', desc: 'We work together as a school family, celebrating diversity and supporting one another.' },
                ].map((v) => (
                  <div key={v.title} className="card">
                    <h3 className="text-lg font-semibold text-brand-700">{v.title}</h3>
                    <p className="mt-2 text-sm text-gray-600">{v.desc}</p>
                  </div>
                ))}
              </div>

              <h2 className="mt-12 text-2xl font-bold text-gray-900">Leadership</h2>
              <p className="mt-4 text-gray-600 leading-relaxed">Frannberry School is led by Mrs Margaret Thornton, our Head Teacher, who brings over twenty years of experience in education. Under her leadership, the school has consistently achieved outstanding results and maintains a strong reputation for pastoral care.</p>

              <h2 className="mt-12 text-2xl font-bold text-gray-900">Facilities</h2>
              <p className="mt-4 text-gray-600 leading-relaxed">Our campus features modern classrooms, well-equipped science laboratories, a dedicated art studio, a comprehensive library and resource centre, extensive sports facilities including a gymnasium and playing fields, and purpose-built ICT suites.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
