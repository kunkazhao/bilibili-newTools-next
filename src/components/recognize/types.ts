export type RecognizeEntry = {
  id: string
  name: string
  price: string
  image: string
  filename?: string
  createdAt?: number
  params: Record<string, string>
}

export type PreviewImage = {
  src: string
  title: string
}
