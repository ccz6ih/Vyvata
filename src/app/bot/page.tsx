export default function BotInfoPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">Vyvata Standards Bot</h1>
      
      <p className="text-lg text-gray-700 mb-8">
        We responsibly collect publicly available supplement data to help consumers 
        and healthcare practitioners make evidence-based decisions about dietary supplements.
      </p>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">What We Collect (Automated)</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>
            <strong>FDA Warning Letters</strong> — Public domain government data tracking 
            enforcement actions against supplement companies
          </li>
          <li>
            <strong>FDA Import Alerts</strong> — Public domain data on products detained 
            at the US border
          </li>
          <li>
            <strong>NIH DSLD</strong> — Dietary Supplement Label Database, a free public 
            API providing structured product label data
          </li>
          <li>
            <strong>PubMed/NCBI</strong> — Clinical research citations and abstracts 
            for evidence-based ingredient analysis
          </li>
        </ul>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">What We DON&apos;T Scrape</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>
            <strong>Certification body databases</strong> — We manually curate quarterly 
            lists from NSF, USP, and Informed Sport (never automated scraping)
          </li>
          <li>
            <strong>Subscription services</strong> — We license or skip ConsumerLab, 
            Labdoor, and similar services (never scrape)
          </li>
          <li>
            <strong>E-commerce platforms</strong> — We don&apos;t scrape Amazon, iHerb, 
            or other retail sites
          </li>
          <li>
            <strong>Any site that requests we stop</strong> — We respond within 48 hours 
            and immediately cease collection
          </li>
        </ul>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Our Data Use Policy</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-semibold mb-2">We Surface Facts, Not Proprietary Data</h3>
          <p className="text-gray-700 mb-4">
            We store certification status as binary facts (e.g., &quot;NSF Certified: Yes&quot;) 
            with links to the official source for verification. We do NOT republish:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
            <li>Testing methodologies</li>
            <li>Contamination reports</li>
            <li>Detailed evaluation criteria</li>
            <li>Proprietary analysis from subscription services</li>
          </ul>
          <p className="text-gray-700 mt-4">
            <strong>Example:</strong> ✓ NSF Certified — verified Jan 2026 · 
            <a href="#" className="text-blue-600 hover:underline ml-1">
              verify on NSF →
            </a>
          </p>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Robots.txt Compliance</h2>
        <p className="text-gray-700 mb-4">
          We respect robots.txt directives on all websites. Our scraper:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>
            Uses a clear User-Agent: <code className="bg-gray-100 px-2 py-1 rounded">
              VyvataStandardsBot/1.0 (+https://vyvata.com/bot)
            </code>
          </li>
          <li>Rate limits to 0.25-1 request per second (conservative)</li>
          <li>Only accesses public domain government APIs</li>
          <li>Never attempts to bypass authentication or paywalls</li>
        </ul>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Opt-Out Request</h2>
        <div className="bg-blue-50 p-6 rounded-lg">
          <p className="text-gray-700 mb-4">
            If you represent a website and want us to stop collecting data from your site:
          </p>
          <p className="text-lg font-semibold mb-2">
            Email: <a href="mailto:data@vyvata.com" className="text-blue-600 hover:underline">
              data@vyvata.com
            </a>
          </p>
          <p className="text-gray-700 mb-4">
            We will respond within <strong>48 hours</strong> and immediately:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
            <li>Stop all automated access to your website</li>
            <li>Remove our scraper from our systems</li>
            <li>Discuss alternative approaches (manual curation, API partnership, etc.)</li>
          </ul>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
        <p className="text-gray-700">
          Vyvata Standards Framework (VSF) is a nonprofit initiative to bring transparency 
          and evidence-based standards to the dietary supplement industry. We believe 
          consumers and healthcare practitioners deserve access to:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 mt-4 ml-4">
          <li>Evidence-quality assessments based on clinical research</li>
          <li>Formulation integrity scoring (bioavailable forms, proper doses)</li>
          <li>Manufacturing quality indicators (GMP compliance, third-party testing)</li>
          <li>Safety profiles (interactions, contraindications)</li>
          <li>Brand transparency (FDA warnings, certification status)</li>
        </ul>
        <p className="text-gray-700 mt-4">
          We achieve this by responsibly aggregating public domain data and partnering 
          with certification bodies, manufacturers, and researchers who share our mission.
        </p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Contact & Partnerships</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">General Inquiries</h3>
            <p className="text-gray-700">
              Email: <a href="mailto:info@vyvata.com" className="text-blue-600 hover:underline">
                info@vyvata.com
              </a>
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Data Partnerships</h3>
            <p className="text-gray-700">
              We&apos;re interested in official data feeds from certification bodies, 
              manufacturers, and research institutions.
            </p>
            <p className="text-gray-700">
              Email: <a href="mailto:partnerships@vyvata.com" className="text-blue-600 hover:underline">
                partnerships@vyvata.com
              </a>
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Security & Privacy</h3>
            <p className="text-gray-700">
              Email: <a href="mailto:security@vyvata.com" className="text-blue-600 hover:underline">
                security@vyvata.com
              </a>
            </p>
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-semibold mb-4">Technical Details</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <dl className="space-y-4">
            <div>
              <dt className="font-semibold">User-Agent:</dt>
              <dd className="text-gray-700 font-mono text-sm">
                VyvataStandardsBot/1.0 (+https://vyvata.com/bot)
              </dd>
            </div>
            <div>
              <dt className="font-semibold">IP Addresses:</dt>
              <dd className="text-gray-700">
                Our scrapers run on Vercel infrastructure. IP ranges vary by region.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Rate Limiting:</dt>
              <dd className="text-gray-700">
                0.25-1 request per second per domain (conservative to avoid server load)
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Retry Policy:</dt>
              <dd className="text-gray-700">
                Exponential backoff on errors, max 3 retries, then skip
              </dd>
            </div>
          </dl>
        </div>
      </section>
      
      <footer className="mt-12 pt-8 border-t border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          Last updated: April 18, 2026 · Vyvata Standards Framework
        </p>
      </footer>
    </div>
  );
}
