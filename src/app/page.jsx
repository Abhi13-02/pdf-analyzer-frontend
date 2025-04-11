import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1>Sign Language PDF</h1>
      <Link href="/pdfAi">
        <div>View PDF</div>
      </Link>
    </div>
  );
}
