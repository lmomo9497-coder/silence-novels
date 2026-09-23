import { Link } from 'react-router-dom'
import { BookX } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'

export default function NotFound() {
  return (
    <div className="container-app py-20">
      <EmptyState
        icon={<BookX className="h-7 w-7" />}
        title="الصفحة غير موجودة"
        description="الرابط الذي تحاول الوصول إليه غير متاح أو تم نقله."
        action={
          <Link to="/" className="btn-primary">
            العودة للرئيسية
          </Link>
        }
      />
    </div>
  )
}
