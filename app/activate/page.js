import SetupQRClient from "./pageClient";

export const metadata = {

    robots: {

        index: false,
        follow: false,
    },
};

export default function Page({ searchParams }) {

  return (
    <SetupQRClient
      searchParams={searchParams}
    />
  );
}