import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Server } from 'lucide-react'

interface CreateCanisterModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateCanister: () => void
  isLoading?: boolean
  error?: string
}

export function CreateCanisterModal({ 
  isOpen, 
  onClose, 
  onCreateCanister, 
  isLoading = false, 
  error 
}: CreateCanisterModalProps) {

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateCanister()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Canister" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}
        
        <div>
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
              <Server className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Create New Canister</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will create a new Internet Computer canister for hosting your applications.
            </p>
            <div className="bg-muted/50 border rounded-lg p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-semibold">0.8 TC</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Creating...
              </div>
            ) : (
              'Create Canister'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}