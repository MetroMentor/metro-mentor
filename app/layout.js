import './globals.css';

export const metadata = {
  title: 'Metro Mentor',
  description: 'Peer tutoring for Metro High School',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
