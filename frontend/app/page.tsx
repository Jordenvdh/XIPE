'use client';

/**
 * Introduction Page
 * First page users see - introduces the XIPE model
 */
import Image from 'next/image';
import Layout from '@/components/layout/Layout';

export default function IntroductionPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">
          The Cross Impact Performance Emissions (XIPE) model for shared mobility
        </h1>
        
        <p className="text-lg mb-8 leading-relaxed text-gray-900 dark:text-gray-300">
          The XIPE model was developed by Cenex Nederland as part of the GEMINI project and 
          estimates the effect shared mobility has on CO2 and air pollution emissions in a city 
          or region. It aims to be easy to use while also being flexible and customisable to reflect 
          real world situations or different scenarios. This is achieved by making all default 
          variables, which are prefilled from literature and previous research, adjustable by the user.
        </p>

        <div className="mb-8">
          <Image
            src="/images/GEMINI_BANNER2.png"
            alt="GEMINI Project Banner"
            width={800}
            height={200}
            className="w-full h-auto"
            priority
          />
        </div>

        <div className="mt-8 space-y-2 text-gray-800 dark:text-gray-400">
          <p>Version: beta</p>
          <p>Published: 2025</p>
        </div>
      </div>
    </Layout>
  );
}
