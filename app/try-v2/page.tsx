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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '56px 16px 16px',
      }}>
        <img src="/coda_cheeky.svg" alt="" style={{ width: 124, height: 124 }} />
      </main>
    </>
  )
}
