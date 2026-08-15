import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://zgsiqenlikzcuhnsncri.supabase.co"
const SUPABASE_KEY = "sb_publishable_HIp1I-QzQ914Pgh0vWdnrw_ESoq7E5C"

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)