/* eslint-env mocha */

const expect = require('chai').expect
// const async = require('async')

const multiaddr = require('multiaddr')
// const Id = require('peer-id')
const Peer = require('peer-info')
const Swarm = require('../src')
const TCP = require('libp2p-tcp')
const WebSockets = require('libp2p-websockets')
const bl = require('bl')
const spdy = require('libp2p-spdy')

describe('basics', () => {
  it('throws on missing peerInfo', (done) => {
    expect(Swarm).to.throw(Error)
    done()
  })
})

describe('transport - tcp', function () {
  this.timeout(10000)

  var swarmA
  var swarmB
  var peerA = new Peer()
  var peerB = new Peer()

  before((done) => {
    peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9888'))
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9999'))
    swarmA = new Swarm(peerA)
    swarmB = new Swarm(peerB)
    done()
  })

  it('add', (done) => {
    swarmA.transport.add('tcp', new TCP())
    expect(Object.keys(swarmA.transports).length).to.equal(1)
    swarmB.transport.add('tcp', new TCP(), () => {
      expect(Object.keys(swarmB.transports).length).to.equal(1)
      done()
    })
  })

  it('listen', (done) => {
    var count = 0
    swarmA.transport.listen('tcp', {}, (conn) => {
      conn.pipe(conn)
    }, ready)
    swarmB.transport.listen('tcp', {}, (conn) => {
      conn.pipe(conn)
    }, ready)

    function ready () {
      if (++count === 2) {
        expect(peerA.multiaddrs.length).to.equal(1)
        expect(peerA.multiaddrs[0]).to.deep.equal(multiaddr('/ip4/127.0.0.1/tcp/9888'))
        expect(peerB.multiaddrs.length).to.equal(1)
        expect(peerB.multiaddrs[0]).to.deep.equal(multiaddr('/ip4/127.0.0.1/tcp/9999'))
        done()
      }
    }
  })

  it('dial to a multiaddr', (done) => {
    const conn = swarmA.transport.dial('tcp', multiaddr('/ip4/127.0.0.1/tcp/9999'), (err, conn) => {
      expect(err).to.not.exist
    })
    conn.pipe(bl((err, data) => {
      expect(err).to.not.exist
      done()
    }))
    conn.write('hey')
    conn.end()
  })

  it('dial to set of multiaddr, only one is available', (done) => {
    const conn = swarmA.transport.dial('tcp', [
      multiaddr('/ip4/127.0.0.1/tcp/9910/websockets'), // not valid on purpose
      multiaddr('/ip4/127.0.0.1/tcp/9910'),
      multiaddr('/ip4/127.0.0.1/tcp/9999'),
      multiaddr('/ip4/127.0.0.1/tcp/9309')
    ], (err, conn) => {
      expect(err).to.not.exist
    })
    conn.pipe(bl((err, data) => {
      expect(err).to.not.exist
      done()
    }))
    conn.write('hey')
    conn.end()
  })

  it('close', (done) => {
    var count = 0
    swarmA.transport.close('tcp', closed)
    swarmB.transport.close('tcp', closed)

    function closed () {
      if (++count === 2) {
        done()
      }
    }
  })

  it('support port 0', (done) => {
    var swarm
    var peer = new Peer()
    peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/0'))
    swarm = new Swarm(peer)
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => {
      conn.pipe(conn)
    }, ready)

    function ready () {
      expect(peer.multiaddrs.length).to.equal(1)
      expect(peer.multiaddrs[0]).to.not.deep.equal(multiaddr('/ip4/127.0.0.1/tcp/0'))
      swarm.close(done)
    }
  })

  it('support addr /ip4/0.0.0.0/tcp/9050', (done) => {
    var swarm
    var peer = new Peer()
    peer.multiaddr.add(multiaddr('/ip4/0.0.0.0/tcp/9050'))
    swarm = new Swarm(peer)
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => {
      conn.pipe(conn)
    }, ready)

    function ready () {
      expect(peer.multiaddrs.length).to.equal(1)
      expect(peer.multiaddrs[0]).to.deep.equal(multiaddr('/ip4/0.0.0.0/tcp/9050'))
      swarm.close(done)
    }
  })

  it('support addr /ip4/0.0.0.0/tcp/0', (done) => {
    var swarm
    var peer = new Peer()
    peer.multiaddr.add(multiaddr('/ip4/0.0.0.0/tcp/0'))
    swarm = new Swarm(peer)
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => {
      conn.pipe(conn)
    }, ready)

    function ready () {
      expect(peer.multiaddrs.length).to.equal(1)
      expect(peer.multiaddrs[0]).to.not.deep.equal(multiaddr('/ip4/0.0.0.0/tcp/0'))
      swarm.close(done)
    }
  })

  it('listen in several addrs', (done) => {
    var swarm
    var peer = new Peer()
    peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9001'))
    peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9002'))
    peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9003'))
    swarm = new Swarm(peer)
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => {
      conn.pipe(conn)
    }, ready)

    function ready () {
      expect(peer.multiaddrs.length).to.equal(3)
      swarm.close(done)
    }
  })
})

describe('transport - websockets', function () {
  this.timeout(10000)

  var swarmA
  var swarmB
  var peerA = new Peer()
  var peerB = new Peer()

  before((done) => {
    peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9888/websockets'))
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9999/websockets'))
    swarmA = new Swarm(peerA)
    swarmB = new Swarm(peerB)
    done()
  })

  it('add', (done) => {
    swarmA.transport.add('ws', new WebSockets())
    expect(Object.keys(swarmA.transports).length).to.equal(1)
    swarmB.transport.add('ws', new WebSockets(), () => {
      expect(Object.keys(swarmB.transports).length).to.equal(1)
      done()
    })
  })

  it('listen', (done) => {
    var count = 0
    swarmA.transport.listen('ws', {}, (conn) => {
      conn.pipe(conn)
    }, ready)
    swarmB.transport.listen('ws', {}, (conn) => {
      conn.pipe(conn)
    }, ready)

    function ready () {
      if (++count === 2) {
        expect(peerA.multiaddrs.length).to.equal(1)
        expect(peerA.multiaddrs[0]).to.deep.equal(multiaddr('/ip4/127.0.0.1/tcp/9888/websockets'))
        expect(peerB.multiaddrs.length).to.equal(1)
        expect(peerB.multiaddrs[0]).to.deep.equal(multiaddr('/ip4/127.0.0.1/tcp/9999/websockets'))
        done()
      }
    }
  })

  it('dial', (done) => {
    const conn = swarmA.transport.dial('ws', multiaddr('/ip4/127.0.0.1/tcp/9999/websockets'), (err, conn) => {
      expect(err).to.not.exist
    })
    conn.pipe(bl((err, data) => {
      expect(err).to.not.exist
      done()
    }))
    conn.write('hey')
    conn.end()
  })

  it('dial (conn from callback)', (done) => {
    swarmA.transport.dial('ws', multiaddr('/ip4/127.0.0.1/tcp/9999/websockets'), (err, conn) => {
      expect(err).to.not.exist

      conn.pipe(bl((err, data) => {
        expect(err).to.not.exist
        done()
      }))
      conn.write('hey')
      conn.end()
    })
  })

  it('close', (done) => {
    var count = 0
    swarmA.transport.close('ws', closed)
    swarmB.transport.close('ws', closed)

    function closed () {
      if (++count === 2) {
        done()
      }
    }
  })
})

describe('transport - utp', function () {
  this.timeout(10000)

  before((done) => { done() })

  it.skip('add', (done) => {})
  it.skip('listen', (done) => {})
  it.skip('dial', (done) => {})
  it.skip('close', (done) => {})
})

describe('high level API - 1st without stream multiplexing (on TCP)', function () {
  this.timeout(20000)

  var swarmA
  var peerA
  var swarmB
  var peerB

  before((done) => {
    peerA = new Peer()
    peerB = new Peer()

    peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9001'))
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9002'))

    swarmA = new Swarm(peerA)
    swarmB = new Swarm(peerB)

    swarmA.transport.add('tcp', new TCP())
    swarmA.transport.listen('tcp', {}, null, ready)

    swarmB.transport.add('tcp', new TCP())
    swarmB.transport.listen('tcp', {}, null, ready)

    var counter = 0

    function ready () {
      if (++counter === 2) {
        done()
      }
    }
  })

  after((done) => {
    var counter = 0

    swarmA.close(closed)
    swarmB.close(closed)

    function closed () {
      if (++counter === 2) {
        done()
      }
    }
  })

  it('handle a protocol', (done) => {
    swarmB.handle('/bananas/1.0.0', (conn) => {
      conn.pipe(conn)
    })
    expect(Object.keys(swarmB.protocols).length).to.equal(1)
    done()
  })

  it('dial on protocol', (done) => {
    swarmB.handle('/pineapple/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    swarmA.dial(peerB, '/pineapple/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      conn.end()
      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', done)
    })
  })

  it('dial on protocol (returned conn)', (done) => {
    swarmB.handle('/apples/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    const conn = swarmA.dial(peerB, '/apples/1.0.0', (err) => {
      expect(err).to.not.exist
    })
    conn.end()
    conn.on('data', () => {}) // let it flow.. let it flooooow
    conn.on('end', done)
  })

  it('dial to warm a conn', (done) => {
    swarmA.dial(peerB, (err) => {
      expect(err).to.not.exist
      done()
    })
  })

  it('dial on protocol, reuse warmed conn', (done) => {
    swarmA.dial(peerB, '/bananas/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      conn.end()
      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', done)
    })
  })
})

describe('stream muxing (on TCP)', function () {
  this.timeout(20000)

  describe('multiplex', () => {
    before((done) => { done() })
    after((done) => { done() })

    it.skip('add', (done) => {})
    it.skip('handle + dial on protocol', (done) => {})
    it.skip('dial to warm conn', (done) => {})
    it.skip('dial on protocol, reuse warmed conn', (done) => {})
    it.skip('enable identify to reuse incomming muxed conn', (done) => {})
  })
  describe('spdy', () => {
    var swarmA
    var peerA
    var swarmB
    var peerB
    var swarmC
    var peerC

    before((done) => {
      peerA = new Peer()
      peerB = new Peer()
      peerC = new Peer()

      // console.log('peer A', peerA.id.toB58String())
      // console.log('peer B', peerB.id.toB58String())
      // console.log('peer C', peerC.id.toB58String())

      peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9001'))
      peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9002'))
      peerC.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9003'))

      swarmA = new Swarm(peerA)
      swarmB = new Swarm(peerB)
      swarmC = new Swarm(peerC)

      swarmA.transport.add('tcp', new TCP())
      swarmA.transport.listen('tcp', {}, null, ready)

      swarmB.transport.add('tcp', new TCP())
      swarmB.transport.listen('tcp', {}, null, ready)

      swarmC.transport.add('tcp', new TCP())
      swarmC.transport.listen('tcp', {}, null, ready)

      var counter = 0

      function ready () {
        if (++counter === 3) {
          done()
        }
      }
    })

    after((done) => {
      var counter = 0

      swarmA.close(closed)
      swarmB.close(closed)
      swarmC.close(closed)

      function closed () {
        if (++counter === 3) {
          done()
        }
      }
    })

    it('add', (done) => {
      swarmA.connection.addStreamMuxer(spdy)
      swarmB.connection.addStreamMuxer(spdy)
      swarmC.connection.addStreamMuxer(spdy)
      done()
    })

    it('handle + dial on protocol', (done) => {
      swarmB.handle('/abacaxi/1.0.0', (conn) => {
        conn.pipe(conn)
      })

      swarmA.dial(peerB, '/abacaxi/1.0.0', (err, conn) => {
        expect(err).to.not.exist
        expect(Object.keys(swarmA.muxedConns).length).to.equal(1)
        conn.end()

        conn.on('data', () => {}) // let it flow.. let it flooooow
        conn.on('end', done)
      })
    })

    it('dial to warm conn', (done) => {
      swarmB.dial(peerA, (err) => {
        expect(err).to.not.exist
        expect(Object.keys(swarmB.conns).length).to.equal(0)
        expect(Object.keys(swarmB.muxedConns).length).to.equal(1)
        done()
      })
    })

    it('dial on protocol, reuse warmed conn', (done) => {
      swarmA.handle('/papaia/1.0.0', (conn) => {
        conn.pipe(conn)
      })

      swarmB.dial(peerA, '/papaia/1.0.0', (err, conn) => {
        expect(err).to.not.exist
        expect(Object.keys(swarmB.conns).length).to.equal(0)
        expect(Object.keys(swarmB.muxedConns).length).to.equal(1)
        conn.end()

        conn.on('data', () => {}) // let it flow.. let it flooooow
        conn.on('end', done)
      })
    })

    it('enable identify to reuse incomming muxed conn', (done) => {
      swarmA.connection.reuse()
      swarmC.connection.reuse()

      swarmC.dial(peerA, (err) => {
        expect(err).to.not.exist
        setTimeout(() => {
          expect(Object.keys(swarmC.muxedConns).length).to.equal(1)
          expect(Object.keys(swarmA.muxedConns).length).to.equal(2)
          done()
        }, 500)
      })
    })
  })
})

describe('conn upgrades', function () {
  this.timeout(20000)

  describe('secio on tcp', () => {
    before((done) => { done() })
    after((done) => { done() })

    it.skip('add', (done) => {})
    it.skip('dial', (done) => {})
    it.skip('tls on a muxed stream (not the full conn)', (done) => {})
  })
  describe('tls on tcp', () => {
    before((done) => { done() })
    after((done) => { done() })

    it.skip('add', (done) => {})
    it.skip('dial', (done) => {})
    it.skip('tls on a muxed stream (not the full conn)', (done) => {})
  })
})

describe('high level API - with everything mixed all together!', function () {
  this.timeout(30000)

  var swarmA // tcp
  var peerA
  var swarmB // tcp+ws
  var peerB
  var swarmC // tcp+ws
  var peerC
  var swarmD // ws
  var peerD
  var swarmE // ws
  var peerE

  before((done) => {
    peerA = new Peer()
    peerB = new Peer()
    peerC = new Peer()
    peerD = new Peer()
    peerE = new Peer()

    // console.log('peer A', peerA.id.toB58String())
    // console.log('peer B', peerB.id.toB58String())
    // console.log('peer C', peerC.id.toB58String())

    swarmA = new Swarm(peerA)
    swarmB = new Swarm(peerB)
    swarmC = new Swarm(peerC)
    swarmD = new Swarm(peerD)
    swarmE = new Swarm(peerE)

    done()
  })

  after((done) => {
    var counter = 0

    swarmA.close(closed)
    swarmB.close(closed)
    swarmC.close(closed)
    swarmD.close(closed)
    swarmE.close(closed)

    function closed () {
      if (++counter === 4) {
        done()
      }
    }
  })

  it('add tcp', (done) => {
    peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/0'))
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/0'))
    peerC.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/0'))

    swarmA.transport.add('tcp', new TCP())
    swarmA.transport.listen('tcp', {}, null, ready)

    swarmB.transport.add('tcp', new TCP())
    swarmB.transport.listen('tcp', {}, null, ready)

    swarmC.transport.add('tcp', new TCP())
    swarmC.transport.listen('tcp', {}, null, ready)

    var counter = 0

    function ready () {
      if (++counter === 3) {
        done()
      }
    }
  })

  it.skip('add utp', (done) => {})

  it('add websockets', (done) => {
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9012/websockets'))
    peerC.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9022/websockets'))
    peerD.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9032/websockets'))
    peerE.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9042/websockets'))

    swarmB.transport.add('ws', new WebSockets())
    swarmB.transport.listen('ws', {}, null, ready)

    swarmC.transport.add('ws', new WebSockets())
    swarmC.transport.listen('ws', {}, null, ready)

    swarmD.transport.add('ws', new WebSockets())
    swarmD.transport.listen('ws', {}, null, ready)

    swarmE.transport.add('ws', new WebSockets())
    swarmE.transport.listen('ws', {}, null, ready)

    var counter = 0

    function ready () {
      if (++counter === 4) {
        done()
      }
    }
  })

  it('add spdy', (done) => {
    swarmA.connection.addStreamMuxer(spdy)
    swarmB.connection.addStreamMuxer(spdy)
    swarmC.connection.addStreamMuxer(spdy)
    swarmD.connection.addStreamMuxer(spdy)
    swarmE.connection.addStreamMuxer(spdy)

    swarmA.connection.reuse()
    swarmB.connection.reuse()
    swarmC.connection.reuse()
    swarmD.connection.reuse()
    swarmE.connection.reuse()

    done()
  })

  it.skip('add multiplex', (done) => {})

  it('dial from tcp to tcp+ws', (done) => {
    swarmB.handle('/anona/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    swarmA.dial(peerB, '/anona/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmA.muxedConns).length).to.equal(1)
      conn.end()

      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', done)
    })
  })

  it('dial from ws to ws', (done) => {
    swarmE.handle('/abacaxi/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    swarmD.dial(peerE, '/abacaxi/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmD.muxedConns).length).to.equal(1)

      conn.end()
      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', () => {
        setTimeout(() => {
          expect(Object.keys(swarmE.muxedConns).length).to.equal(1)
          done()
        }, 1000)
      })
    })
  })

  it('dial from tcp to tcp+ws (returned conn)', (done) => {
    swarmB.handle('/grapes/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    const conn = swarmA.dial(peerB, '/grapes/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmA.muxedConns).length).to.equal(1)
    })
    conn.end()

    conn.on('data', () => {}) // let it flow.. let it flooooow
    conn.on('end', done)
  })

  it('dial from tcp+ws to tcp+ws', (done) => {
    swarmC.handle('/mamao/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    swarmA.dial(peerC, '/mamao/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmA.muxedConns).length).to.equal(2)
      conn.end()

      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', done)
    })
  })
})
