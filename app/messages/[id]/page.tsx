import MessagingInbox from '@/components/MessagingInbox'

type MessagesConversationPageProps = {
  params: Promise<{ id: string }>
}

export default async function MessagesConversationPage({
  params,
}: MessagesConversationPageProps) {
  const { id } = await params

  return <MessagingInbox activeConversationId={id} />
}
