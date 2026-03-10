import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="application-name" content="Accident Payments" />
        <meta name="theme-color" content="#ae4010" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
