import DocumentManager from '../components/DocumentManager';
import { PDN_DOCUMENT_TYPES, THREAT_DOCUMENT_TYPES } from '../constants/pdnDocuments';

interface CompanyDocumentsPanelProps {
  companyId: number;
}

export default function CompanyDocumentsPanel({ companyId }: CompanyDocumentsPanelProps) {
  return (
    <>
      <DocumentManager
        companyId={companyId}
        title="Документы по ПДн"
        description="Положение об обработке ПДн, согласия, приказы и иные документы компании"
        documentTypes={PDN_DOCUMENT_TYPES}
        style={{ marginBottom: 16 }}
      />
      <DocumentManager
        companyId={companyId}
        title="Модель угроз"
        description="Документы модели угроз информационных систем"
        documentTypes={THREAT_DOCUMENT_TYPES}
      />
    </>
  );
}
