package noria.layout

import java.lang.RuntimeException

fun d() {

  infix fun Int.should(x: Int): Boolean {
    return this == x
  }

  with(1) {
    val value = this
    value
  }

  5 should with (2) {
    this + 3
  }

  val recFun: Int?.() -> Int = {
    239
  }

  val casted = recFun as kotlin.Int?.() -> Int

  kotlin.Int?::toString

  val string: String = "string"
  val s = string ?: null
  val kFunction1 = String?::equals::toString
  val kFunction2 = string::compareTo::toString
  val z = false
  val kFunction3 = (1 < 2 > false)::class::toString
  val y = 2
  //val kFunction4 = (1 < y > false)::class::toString
  val kFunction5 = List<Int>::get::toString

  fun <Q> aFun(param: Q): Q? {
    val nothing: Q? = param
    val x = return null
    return null
  }

  val aFunReference: (Boolean) -> Boolean? = ::aFun
  aFunReference(false)
  aFun<Boolean>(false)
  1<2>(false)

  3 as Int ?: throw RuntimeException()
  3 as Int?

  val c: OuterClass<Int> = OuterClass()
  val kFunction0: () -> Int? = c.Inner(4)::method
  val methodRef: (OuterClass<Int>.Inner) -> Int? = noria.layout.OuterClass<Int>.Inner::method
}

class OuterClass<T> {
  inner class Inner(arg: Int) {
    fun method(): T? {
      return null
    }
    //companion object
  }
}