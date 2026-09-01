"use client"

import { useState } from "react"
import { vendorsApi } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { X, Plus, Trash2 } from "lucide-react"

interface SubmitQuoteModalProps {
  rfp: any
  onClose: () => void
  onSuccess: () => void
}

export function SubmitQuoteModal({ rfp, onClose, onSuccess }: SubmitQuoteModalProps) {
  const defaultMaterial = rfp?.material_requests?.material || rfp?.rfp_items?.[0]?.item || "Material Item"
  const defaultQty = rfp?.material_requests?.quantity || rfp?.rfp_items?.[0]?.quantity || 1
  const defaultUnit = rfp?.material_requests?.unit || rfp?.rfp_items?.[0]?.unit || "Units"

  const [validityDays, setValidityDays] = useState(30)
  const [deliveryDays, setDeliveryDays] = useState(7)
  const [terms, setTerms] = useState("50% advance upon PO, balance on delivery.")
  const [items, setItems] = useState<any[]>([
    {
      item: defaultMaterial,
      quantity: defaultQty,
      unit: defaultUnit,
      unit_price: 500,
      total: defaultQty * 500,
      tax: 0,
    }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...items]
    updated[index][field] = val
    if (field === "quantity" || field === "unit_price") {
      const q = Number(updated[index].quantity) || 0
      const p = Number(updated[index].unit_price) || 0
      updated[index].total = q * p
    }
    setItems(updated)
  }

  const addItem = () => {
    setItems([...items, { item: "", quantity: 1, unit: "Units", unit_price: 100, total: 100, tax: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const calculatedTotal = items.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await vendorsApi.submitQuote(rfp.id, {
        total_amount: calculatedTotal,
        currency: "INR",
        validity_period_days: Number(validityDays),
        delivery_timeline_days: Number(deliveryDays),
        terms,
        items,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit quote")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Submit Quotation</h2>
            <p className="text-xs text-slate-500 mt-0.5">RFP #{rfp.id.substring(0, 8)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Validity Period (Days)</label>
              <input
                type="number"
                min="1"
                required
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Delivery Timeline (Days)</label>
              <input
                type="number"
                min="1"
                required
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Payment Terms & Notes</label>
            <textarea
              rows={2}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Line Items Breakdown</label>
              <button type="button" onClick={addItem} className="text-xs flex items-center text-primary font-medium hover:underline">
                <Plus className="w-3 h-3 mr-1" /> Add Row
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Item name"
                      required
                      value={item.item}
                      onChange={(e) => handleItemChange(idx, "item", e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Unit"
                      required
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Unit Price ₹"
                      required
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, "unit_price", e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-emerald-900">Total Quote Amount:</span>
            <span className="text-xl font-bold text-emerald-700">₹{calculatedTotal.toLocaleString("en-IN")}</span>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Quote"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
