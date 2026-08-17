import React from 'react';

export default function MentorProfile() {
  // This is placeholder data! 
  // Later, you will replace this by fetching data from your database (like Firebase, Supabase, or MongoDB) using the mentor's ID.
  const mentorData = {
    name: "Alex Smith",
    major: "Computer Science",
    totalHoursTutored: 45,
    classesToMentor: ["CS 101: Intro to Programming", "MATH 201: Calculus I", "ENG 105: College Writing"],
    reviews: [
      {
        id: 1,
        studentName: "Sarah J.",
        rating: 5,
        comment: "Alex is incredibly patient and helped me finally understand loops!"
      },
      {
        id: 2,
        studentName: "Michael T.",
        rating: 4,
        comment: "Great session. We got through my calculus homework in half the time it usually takes me."
      }
    ]
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* Header Section */}
      <header style={{ borderBottom: '2px solid #eee', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{mentorData.name}</h1>
        <p style={{ fontSize: '1.2rem', color: '#555' }}>Major: {mentorData.major}</p>
      </header>

      {/* Stats Section */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Mentorship Stats</h2>
        <p style={{ fontSize: '1.2rem' }}>
          <strong>Total Hours Tutored:</strong> {mentorData.totalHoursTutored} hours
        </p>
      </section>

      {/* Classes Section */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Classes I Can Mentor</h2>
        <ul style={{ listStyleType: 'square', marginLeft: '1.5rem' }}>
          {mentorData.classesToMentor.map((className, index) => (
            <li key={index} style={{ marginBottom: '0.5rem' }}>{className}</li>
          ))}
        </ul>
      </section>

      {/* Reviews Section */}
      <section>
        <h2>Student Reviews</h2>
        {mentorData.reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mentorData.reviews.map((review) => (
              <div key={review.id} style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{review.studentName}</strong>
                  <span>{'⭐'.repeat(review.rating)}</span>
                </div>
                <p style={{ margin: 0 }}>"{review.comment}"</p>
              </div>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
