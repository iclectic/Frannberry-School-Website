import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AdmissionsPage() {
  const steps = [
    { step: '1', title: 'Enquiry', desc: 'Contact our admissions team or complete an online enquiry form to express your interest.' },
    { step: '2', title: 'Visit', desc: 'Attend one of our open days or arrange a private tour to see our facilities and meet our staff.' },
    { step: '3', title: 'Application', desc: 'Complete the application form and submit along with the required documentation.' },
    { step: '4', title: 'Assessment', desc: 'Your child will be invited to attend an assessment day appropriate to their year group.' },
    { step: '5', title: 'Offer', desc: 'Successful applicants will receive an offer letter with details of next steps and enrolment.' },
  ];

  return (
    <>
      <Navbar />
      <main>
        <section className="bg-gradient-to-br from-brand-800 to-brand-900 py-16 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold sm:text-5xl">Admissions</h1>
            <p className="mt-4 max-w-2xl text-lg text-brand-100">We welcome applications from families who share our commitment to academic excellence and personal growth.</p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900">Admissions Process</h2>
            <p className="mt-3 text-gray-600">Our admissions process is designed to be straightforward and supportive. Here is what to expect:</p>

            <div className="mt-10 space-y-6">
              {steps.map((s) => (
                <div key={s.step} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">{s.step}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 card bg-brand-50 border-brand-200">
              <h3 className="text-lg font-semibold text-brand-800">Key Dates for 2026/2027</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li><strong>Open Day:</strong> Saturday 10th October 2026, 10:00 AM – 1:00 PM</li>
                <li><strong>Application Deadline:</strong> Friday 15th January 2027</li>
                <li><strong>Assessment Days:</strong> Week commencing 1st February 2027</li>
                <li><strong>Offers Issued:</strong> Friday 1st March 2027</li>
              </ul>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/contact" className="btn-primary">Contact Admissions</Link>
              <Link href="/about" className="btn-secondary">Learn More About Us</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
