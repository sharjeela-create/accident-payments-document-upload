import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Accident Payments | Secure Document Upload</title>
        <meta
          name="description"
          content="Securely upload required documents for your Accident Payments case using the link and passcode provided by your agent."
        />
        <meta name="robots" content="noindex,nofollow" />

        <meta property="og:title" content="Accident Payments | Secure Document Upload" />
        <meta
          property="og:description"
          content="Securely upload required documents for your Accident Payments case using the link and passcode provided by your agent."
        />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Accident Payments | Secure Document Upload" />
        <meta
          name="twitter:description"
          content="Securely upload required documents for your Accident Payments case using the link and passcode provided by your agent."
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
