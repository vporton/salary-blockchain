../target/debug/moonbeam \
    --execution=Native \
    --no-telemetry \
    --no-prometheus \
    --dev \
    --tmp \
    --ethapi=txpool,debug,trace \
    --sealing=manual \
    --port=19931 \
    --rpc-port=19932 \
    --ws-port=19933 \
     & echo $! > .pid
