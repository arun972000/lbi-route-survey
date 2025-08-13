import Image from "next/image";

import Navbar from "./components/Navbar/Navbar";
import GetEstimateWrapper from "./components/EstimateForm/EstimateParent";
import Footer from "./components/Footer/Footer";
import Client from "./components/Clients/Clients";

export default function Home() {
  return (
    <>
      <Navbar />
      <div style={{ marginTop: 100 }}>
        <GetEstimateWrapper />
        <Client/>
      </div>
      <Footer />
    </>
  );
}
