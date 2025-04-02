import StatCard from "@/components/shared/validator_dashboard/StatCard";
import StakeForm from "@/components/shared/validator_dashboard/StakeForm";
import PendingTestamentTable from "@/components/shared/validator_dashboard/PendingTestamentTable";
import DecryptModal from "@/components/shared/validator_dashboard/DecryptModal";
import EventLogList from "@/components/shared/Events";

import useValidatorDashboard from "./hooks/useValidatorDashboard";

export default function ValidatorDashboard() {
  const {
    address,
    isAuthorized,
    stakeInput,
    setStakeInput,
    stakedAmount,
    pendingTestaments,
    checkedCount,
    rejectedRatio,
    isModalOpen,
    decryptedFile,
    decryptCID,
    approveTestament,
    rejectTestament,
    closeModal,
    handleStake,
    handleWithdraw,
    events,
    pendingActionHash,
  } = useValidatorDashboard();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-6">Tableau de bord du Validateur</h1>
      <div>
        address {address} is authorized? {isAuthorized?.toString()}
      </div>

      {!isAuthorized ? (
        <section className="bg-white rounded-lg shadow p-4 mb-8">
          <h2 className="text-xl font-semibold mb-4">Rejoindre le réseau</h2>
          <StakeForm onStake={handleStake} onWithdraw={handleWithdraw} />
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Testaments en attente" value={pendingTestaments.length} />
            <StatCard label="Testaments checkés" value={checkedCount} />
            <StatCard label="% refusés" value={rejectedRatio} />
            <StatCard label="Jetons stakés" value={`${stakedAmount} INHX`} />
          </section>

          <section className="bg-white rounded-lg shadow p-4 mb-8">
            <h2 className="text-xl font-semibold mb-4">Staking</h2>
            <StakeForm onStake={handleStake} onWithdraw={handleWithdraw} />
          </section>

          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Testaments en attente</h2>
            <PendingTestamentTable testaments={pendingTestaments} onDecrypt={decryptCID} />
          </section>
        </>
      )}

      {isModalOpen && (
        <DecryptModal
          file={decryptedFile}
          onApprove={approveTestament}
          onReject={rejectTestament}
          onClose={closeModal}
          pendingActionHash={pendingActionHash}
        />
      )}

      <section>
        <EventLogList events={events} />
      </section>
    </div>
  );
}