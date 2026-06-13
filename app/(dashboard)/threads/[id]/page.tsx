import { redirect } from 'next/navigation'

export default function ThreadDetailPage({ params }: { params: { id: string } }) {
  redirect(`/threads?open=${params.id}`)
}
