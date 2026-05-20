use anchor_lang::prelude::*;

declare_id!("ieBaBaedCadehYhjhesE8yo4pAfdT82t4Z3Y8ic9b1n");

#[program]
pub mod capstone_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
