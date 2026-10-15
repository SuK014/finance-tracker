-- A recurring price can be billed in a different currency than the account it is paid from (e.g. USD)
ALTER TABLE "RecurringTransaction" ADD COLUMN "currency" TEXT;
