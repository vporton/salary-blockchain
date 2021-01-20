
use sp_core::{ecdsa, Pair, Public};
use moonbeam_runtime::{AccountId, Signature};
use sp_runtime::traits::{IdentifyAccount, Verify};
use std::str::FromStr;
use account::{EthereumSigner, EthereumSignature};

// These first two functions are copied directly from the Substrate node template.
// https://github.com/paritytech/substrate/blob/d5bdd81de1af28250f4bef32a06a6e2dfd80c800/bin/node-template/node/src/chain_spec.rs#L18-L31
pub fn get_from_seed<TPublic: Public>(seed: &str) -> <TPublic::Pair as Pair>::Public {
	TPublic::Pair::from_string(&format!("//{}", seed), None)
		.expect("static values are valid; qed")
		.public()
}

type AccountPublic = <Signature as Verify>::Signer;

pub fn get_account_id_from_seed<TPublic: Public>(seed: &str) -> AccountId
where
	AccountPublic: From<<TPublic::Pair as Pair>::Public>,
{
	AccountPublic::from(get_from_seed::<TPublic>(seed)).into_account()
}

// Some subkey ouutput for reference
//
// $ subkey inspect --scheme ecdsa //Alice
// Secret Key URI `//Alice` is account:
//   Secret seed:      0xcb6df9de1efca7a3998a8ead4e02159d5fa99c3e0d4fd6432667390bb4726854
//   Public key (hex): 0x020a1091341fe5664bfa1782d5e04779689068c916b04cb365ec3153755684d9a1
//   Account ID:       0x01e552298e47454041ea31273b4b630c64c104e4514aa3643490b8aaca9cf8ed
//   SS58 Address:     5C7C2Z5sWbytvHpuLTvzKunnnRwQxft1jiqrLD5rhucQ5S9X

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn alice_agrees_with_apps_node_template_style() {
		let calculated_alice = get_account_id_from_seed::<ecdsa::Public>("Alice");
		let apps_alice = AccountId::from_str("58daD74c38e9c4738bF3471f6aac6124f862FAf5").unwrap();

		assert_eq!(calculated_alice, apps_alice);
	}

	#[test]
	fn alice_agrees_with_apps_custom() {
		let apps_alice = AccountId::from_str("58daD74c38e9c4738bF3471f6aac6124f862FAf5").unwrap();

		// This agrees with subkey
		let alice_public = get_from_seed::<ecdsa::Public>("Alice");
		let alice_eth_signer = EthereumSigner::from(alice_public);
		let alice_account = alice_eth_signer.into_account();

		assert_eq!(alice_account, apps_alice);
	}

	#[test]
	fn node_template_method_agrees_with_custom_method() {
		let calculated_alice = get_account_id_from_seed::<ecdsa::Public>("Alice");

		// This agrees with subkey
		let alice_public = get_from_seed::<ecdsa::Public>("Alice");
		let alice_eth_signer = EthereumSigner::from(alice_public);
		let alice_account = alice_eth_signer.into_account();

		assert_eq!(alice_account, calculated_alice);
	}

	#[test]
	fn make_sure_some_silly_conversion_attempt_isnt_happening() {
		// This is NOT what we want. I'm just making sure we aren't doing it by accident.
		assert!(AccountId::from_str("Alice").is_err());
	}
}
