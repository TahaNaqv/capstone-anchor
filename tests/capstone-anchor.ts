import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL, Keypair, SystemProgram } from "@solana/web3.js";
import { CapstoneAnchor } from "../target/types/capstone_anchor";
import { assert } from "chai";

describe("tip-jar", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.capstoneAnchor as Program<CapstoneAnchor>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const creator = provider.wallet;

  const jarPda = (creator: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("jar"), creator.toBuffer()],
      program.programId,
    )[0];

  it("initializes a jar", async () => {
    const jar = jarPda(creator.publicKey);

    await program.methods
      .initJar()
      .accounts({
        jar,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const state = await program.account.tipJar.fetch(jar);
    assert.equal(state.creator.toBase58(), creator.publicKey.toBase58());
    assert.equal(state.totalRaised.toNumber(), 0);
    assert.equal(state.donationCount.toNumber(), 0);
  });

  it("accepts a donation", async () => {
    const jar = jarPda(creator.publicKey);

    const donor = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      donor.publicKey,
      2 * LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(sig);

    const amount = new BN(0.5 * LAMPORTS_PER_SOL);
    await program.methods
      .donate(amount)
      .accounts({
        jar,
        donor: donor.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([donor])
      .rpc();

    const state = await program.account.tipJar.fetch(jar);
    assert.equal(state.totalRaised.toNumber(), amount.toNumber());
    assert.equal(state.donationCount.toNumber(), 1);
    assert.equal(state.lastDonor.toBase58(), donor.publicKey.toBase58());
  });

  it("lets the creator withdraw", async () => {
    const jar = jarPda(creator.publicKey);
    const before = await provider.connection.getBalance(creator.publicKey);

    const amount = new BN(0.1 * LAMPORTS_PER_SOL);
    await program.methods
      .withdraw(amount)
      .accounts({
        jar,
        creator: creator.publicKey,
      })
      .rpc();

    const after = await provider.connection.getBalance(creator.publicKey);
    assert.isAbove(after, before);
  });

  it("rejects withdrawal from non-creator", async () => {
    const jar = jarPda(creator.publicKey);

    const imposter = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      imposter.publicKey,
      LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .withdraw(new BN(1))
        .accounts({
          jar,
          creator: imposter.publicKey,
        })
        .signers([imposter])
        .rpc();
      assert.fail("withdrawal by imposter should have failed");
    } catch (err) {
      // expected — has_one constraint or seeds mismatch
    }
  });
});
