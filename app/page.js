import Image from "next/image";

import Navbar from "./components/Navbar/Navbar";
import GetEstimateWrapper from "./components/EstimateForm/EstimateParent";

export default function Home() {
  return (
    <>
      <Navbar />
      <GetEstimateWrapper />
    </>
  );
}
