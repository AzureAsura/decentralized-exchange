// Pathfinding murni (nggak ada wagmi/React) — gampang diverifikasi kebenarannya sendiri, dipanggil
// dari hooks/use-swap-route.ts. BFS selalu balikin path TERPENDEK, jadi kalau pair langsung ada,
// itu yang selalu kepilih duluan (jarak 1) — swap yang udah jalan sekarang nggak akan pernah
// ke-reroute lewat token lain.

interface PairEdge {
    token0: `0x${string}`
    token1: `0x${string}`
}

export function buildAdjacency(pairs: PairEdge[]): Map<string, Set<`0x${string}`>> {
    const graph = new Map<string, Set<`0x${string}`>>()

    const addEdge = (a: `0x${string}`, b: `0x${string}`) => {
        const key = a.toLowerCase()
        if (!graph.has(key)) graph.set(key, new Set())
        graph.get(key)!.add(b)
    }

    for (const { token0, token1 } of pairs) {
        addEdge(token0, token1)
        addEdge(token1, token0)
    }

    return graph
}

// maxHops dihitung dalam jumlah PAIR yang dilewati (bukan jumlah token di path) — dibatasin biar
// nggak nyasar ke rute panjang yang nggak realistis (tiap hop nambah 0.3% fee + price impact pool
// itu sendiri). Default 3 hop (maks 4 token di path) — generous buat testnet ini, gampang diubah.
export function findSwapPath(
    from: `0x${string}`,
    to: `0x${string}`,
    graph: Map<string, Set<`0x${string}`>>,
    maxHops = 3
): `0x${string}`[] | undefined {
    if (from.toLowerCase() === to.toLowerCase()) return undefined

    const visited = new Set<string>([from.toLowerCase()])
    const queue: `0x${string}`[][] = [[from]]

    while (queue.length > 0) {
        const path = queue.shift()!
        if (path.length > maxHops) continue // udah kepakai maxHops pair-hop, jangan diperpanjang lagi

        const last = path[path.length - 1]
        const neighbors = graph.get(last.toLowerCase()) ?? new Set()

        for (const neighbor of neighbors) {
            if (neighbor.toLowerCase() === to.toLowerCase()) return [...path, neighbor]
            if (!visited.has(neighbor.toLowerCase())) {
                visited.add(neighbor.toLowerCase())
                queue.push([...path, neighbor])
            }
        }
    }

    return undefined
}
