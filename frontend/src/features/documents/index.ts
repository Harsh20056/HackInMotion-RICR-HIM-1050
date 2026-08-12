export { DocumentLockerSection } from "./components/DocumentLockerSection";
export { useDocuments } from "./hooks/useDocuments";
export { documentService } from "./services/documentService";
export { documentRepository } from "./repositories/documentRepository";
// DocumentsPage is intentionally NOT re-exported here — it's lazy-loaded
// directly by AppRoutes.
