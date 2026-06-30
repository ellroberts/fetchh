const FONT = 'var(--font-karla), sans-serif'

export default function TryV2() {
  return (
    <>
      {/* Fixed top nav */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        background: '#FFF', boxShadow: '0px 2px 1px rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}>
        <img src="/fetchh-logo.svg" alt="Fetchh" style={{ height: 24 }} />
      </div>

      <main style={{
        background: '#ffd19d',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '80px 16px',
        paddingTop: 104,
      }}>
        {/* Dog above card */}
        <img src="/coda_cheeky.svg" alt="" style={{ width: 124, height: 124, position: 'relative', zIndex: 1, marginBottom: 32 }} />

        {/* Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 24,
          padding: 32,
          width: 480,
          maxWidth: '100%',
          boxShadow: '0px 4px 14px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}>
          {/* Heading */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, fontFamily: FONT, color: '#000', lineHeight: 'normal' }}>
              Catch the highlights
            </h1>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 600, fontFamily: FONT, lineHeight: '28px', color: '#000' }}>
              Get a quick summary on a YouTube video
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
