import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="bg-gradient-to-br from-brand-800 to-brand-900 py-16 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold sm:text-5xl">Contact Us</h1>
            <p className="mt-4 max-w-2xl text-lg text-brand-100">We would love to hear from you. Get in touch with our team.</p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Get in Touch</h2>
                <p className="mt-3 text-gray-600">Whether you have a question about admissions, need to speak to a member of staff, or would like to arrange a visit, please do not hesitate to contact us.</p>

                <div className="mt-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Address</h3>
                    <p className="mt-2 text-gray-700">123 School Lane<br />London, EC1A 1BB<br />United Kingdom</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Telephone</h3>
                    <p className="mt-2 text-gray-700">020 7123 4567</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Email</h3>
                    <p className="mt-2 text-gray-700">info@frannberry.school</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Office Hours</h3>
                    <p className="mt-2 text-gray-700">Monday to Friday: 8:00 AM – 4:30 PM<br />Saturday &amp; Sunday: Closed</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <h2 className="text-xl font-bold text-gray-900">Send Us a Message</h2>
                <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className="label-text">First Name</label>
                      <input id="firstName" type="text" className="input-field" placeholder="Your first name" />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="label-text">Last Name</label>
                      <input id="lastName" type="text" className="input-field" placeholder="Your last name" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contactEmail" className="label-text">Email</label>
                    <input id="contactEmail" type="email" className="input-field" placeholder="you@example.com" />
                  </div>
                  <div>
                    <label htmlFor="subject" className="label-text">Subject</label>
                    <input id="subject" type="text" className="input-field" placeholder="How can we help?" />
                  </div>
                  <div>
                    <label htmlFor="message" className="label-text">Message</label>
                    <textarea id="message" rows={5} className="input-field" placeholder="Your message…" />
                  </div>
                  <button type="submit" className="btn-primary w-full">Send Message</button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
