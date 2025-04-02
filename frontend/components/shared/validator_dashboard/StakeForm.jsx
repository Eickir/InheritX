import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function StakeForm({ onStake, onWithdraw }) {
  const [stakeInput, setStakeInput] = useState("");

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center">
      <Input
        placeholder="Montant à staker"
        value={stakeInput}
        onChange={(e) => setStakeInput(e.target.value)}
        className="w-full md:w-1/3"
      />
      <Button onClick={() => onStake(stakeInput)} disabled={!stakeInput}>Stake</Button>
      <Button variant="destructive" onClick={onWithdraw}>Withdraw</Button>
    </div>
  );
}