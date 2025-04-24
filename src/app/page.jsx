"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          Empowering the Deaf and Blind
        </h1>
        <p className="text-gray-600 text-lg md:text-xl max-w-xl">
          This project bridges communication gaps through Sign Language Detection for the deaf and PDF reading tools for the blind.
        </p>
      </motion.div>

      <div className="flex justify-center w-full max-w-5xl">
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-full max-w-md"
        >
          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-6 flex flex-col items-center">
              <Image src="/image.png" alt="PDF Reader" width={200} height={200} className="rounded-xl mb-4" />
              <h2 className="text-2xl font-semibold mb-2">PDF Reader for Blind</h2>
              <p className="text-gray-600 mb-4">Reads out PDF content with high clarity and assistive controls.</p>
              <Link href="/pdfAi">
                <Button>Read PDF</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}