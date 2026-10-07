// lib/sanity.js
import { createClient } from '@sanity/client'

export const sanityClient = createClient({
    projectId: import.meta.env.SANITY_PROJECT_ID || 'tu-project-id-directo', // Usa variables de entorno
    dataset: import.meta.env.SANITY_DATASET || 'production',
    apiVersion: '2024-01-01', // Usa una fecha reciente
    useCdn: true // Para producción
})

// Cliente alternativo para drafts
export const sanityClientPreview = createClient({
    projectId: import.meta.env.SANITY_PROJECT_ID || 'tu-project-id-directo',
    dataset: import.meta.env.SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    useCdn: false,
    token: import.meta.env.SANITY_API_TOKEN // Para contenido draft
})