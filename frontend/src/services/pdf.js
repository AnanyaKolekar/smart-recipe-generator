import { jsPDF } from 'jspdf'

/**
 * Download recipe as a formatted PDF document.
 * @param {object} recipe
 */
export function downloadRecipePDF(recipe) {
  const doc = new jsPDF()
  const margin = 20
  let y = margin
  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - margin * 2

  const addText = (text, fontSize = 11, style = 'normal') => {
    doc.setFont('helvetica', style)
    doc.setFontSize(fontSize)
    const lines = doc.splitTextToSize(text, maxWidth)
    lines.forEach((line) => {
      if (y > 270) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += fontSize * 0.45 + 2
    })
    y += 4
  }

  const addSection = (title) => {
    y += 4
    addText(title, 13, 'bold')
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('RecipeGenAI', margin, y)
  y += 12

  addText(recipe.recipe_name || 'Recipe', 16, 'bold')
  addText(recipe.description || '', 11)

  if (recipe.ingredients?.length) {
    addSection('Ingredients')
    recipe.ingredients.forEach((item, i) => addText(`${i + 1}. ${item}`))
  }

  if (recipe.missing_ingredients?.length) {
    addSection('Missing Ingredients')
    recipe.missing_ingredients.forEach((item) => addText(`- ${item}`))
  }

  if (recipe.shopping_list?.length) {
    addSection('Shopping List')
    recipe.shopping_list.forEach((item) => addText(`- ${item}`))
  }

  const n = recipe.nutrition || {}
  addSection('Nutrition (per serving)')
  addText(
    `Calories: ${n.calories ?? 'N/A'} | Protein: ${n.protein ?? 'N/A'}g | Carbs: ${n.carbs ?? 'N/A'}g | Fat: ${n.fat ?? 'N/A'}g`,
  )

  if (recipe.instructions?.length) {
    addSection('Instructions')
    recipe.instructions.forEach((step, i) => addText(`${i + 1}. ${step}`))
  }

  if (recipe.tips?.length) {
    addSection('Cooking Tips')
    recipe.tips.forEach((tip) => addText(`* ${tip}`))
  }

  if (recipe.serving_suggestions?.length) {
    addSection('Serving Suggestions')
    recipe.serving_suggestions.forEach((s) => addText(`- ${s}`))
  }

  const filename = (recipe.recipe_name || 'recipe')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  doc.save(`${filename || 'recipe'}.pdf`)
}
