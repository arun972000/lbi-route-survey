"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/autoplay";
import Image from "next/image";

const ClientSection = () => {
  const images = [
    "/images/tata.webp",
    "/images/image 53.webp",
    "/images/image 47.webp",
    "/images/image 49.webp",
    "/images/image 43.webp",
    "/images/rsb.webp",
    "/images/pentar.webp",
    "/images/jsw-logo.jpg",
    "/images/renew-bg.png",
    "/images/eil.webp",
    "/images/lo.webp",
    "/images/road.webp",
    "/images/asho.png",
    "/images/db.webp",
    "/images/so.webp",
    "/images/yusen.webp",
    "/images/mahi.webp",
    "/images/frost.webp",
    "/images/bc.jpg",
    "/images/toshiba.webp",
    "/images/t.png",
    "/images/image 45.webp",
    "/images/bus.jpg",
  ];

  return (
    <div className="w-full">
      <div className="py-6 sm:py-8">
        <Swiper
          spaceBetween={24}
          loop
          speed={800}
          autoplay={{ delay: 1000, disableOnInteraction: false }}
          modules={[Autoplay]}
          breakpoints={{
            0:   { slidesPerView: 2, slidesPerGroup: 1 },
            576: { slidesPerView: 3, slidesPerGroup: 1 },
            992: { slidesPerView: 5, slidesPerGroup: 1 },
          }}
        >
          {images.map((src, idx) => (
            <SwiperSlide key={idx} className="flex items-center justify-center">
              {/* Uniform tile for every logo */}
              <div className="relative h-24 w-40 sm:h-28 sm:w-48 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm">
                <Image
                  src={src}
                  alt={`Client ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 160px, (max-width: 1024px) 192px, 192px"
                  className="p-3 object-contain"
                  priority={idx < 5}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

function Client() {
  return (
    <section className="mx-auto max-w-7xl px-4">
      <h1 className="mb-4 mt-6 text-center text-2xl font-bold sm:text-3xl">
        <span className="text-black">Our</span>{" "}
        <span className="text-[#293BB1]">Clients</span>
      </h1>
      <ClientSection />
    </section>
  );
}

export default Client;
