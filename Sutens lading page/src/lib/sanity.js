import { createClient } from '@sanity/client'

export const sanityClient = createClient({
    projectId: 'qw97bn6o',
    dataset: 'production',
    apiVersion: '2024-01-01',
    useCdn: true
})